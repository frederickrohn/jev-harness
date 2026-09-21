import os
from hmac import compare_digest
from string import ascii_lowercase

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from typesafe_sdk import AsyncTypeSafeClient, Choice

from schemas import AutoRegressiveChatRequest, AutoRegressiveChatResponse, RobotSituation

# --------------init----------------------
load_dotenv()
api_key = os.getenv("JEV_SECRET_API_KEY")
proxy_secret = os.getenv("BACKEND_PROXY_SECRET")
app = FastAPI(title="Jev Lab")


# ---------------constants----------------
MAX_ITERATIONS = 20
RERANK_COUNT = 5
RERANK_CONFIDENCE_THRESHOLD = 0.4


# -------------middleware-----------------
@app.middleware("http")
async def require_api_key(request: Request, call_next):
    if not api_key:
        return JSONResponse(
            status_code=500,
            content={"detail": "JEV_SECRET_API_KEY is not set"},
        )
    # this is just a standin while we don't have authentication set up
    if not proxy_secret:
        return JSONResponse(
            status_code=500,
            content={"detail": "BACKEND_PROXY_SECRET is not set"},
        )
    request_secret = request.headers.get("x-jev-proxy-secret", "")
    if not compare_digest(request_secret, proxy_secret):
        return JSONResponse(
            status_code=401,
            content={"detail": "Invalid backend proxy credentials"},
        )
    return await call_next(request)


# ------------endpoints--------------------


# most basic usage of JEV model, just a basic classification that chooses which is best.
@app.post("/decide")
async def decide(body: RobotSituation):
    async with AsyncTypeSafeClient(api_key=api_key, model="jev-latest") as client:
        response = await client.system_one(
            state=body.situation,
            questions={
                "action": Choice(
                    instructions="What should the warehouse robot do next?",
                    criteria={
                        "move": "The path is clear and it is safe to continue.",
                        "slow": "The robot should continue carefully at a lower speed.",
                        "stop": "The robot should not move until the path is clear.",
                    },
                )
            },
        )
    return response


# runs a loop that makes JEV behave like an auto-regressive model (like other LLMs)
@app.post("/autoregressive-chat", response_model=AutoRegressiveChatResponse)
async def autoregressive_chat(body: AutoRegressiveChatRequest):
    answer = ""
    input_tokens = 0
    output_tokens = 0

    async with AsyncTypeSafeClient(api_key=api_key, model="jev-latest") as client:
        for iteration in range(1, MAX_ITERATIONS + 1):
            state = {
                "question": body.question,
                "answer_so_far": answer,
            }
            instructions = (
                "The answer must be exactly one lowercase English word that correctly "
                "answers `question`. Choose the next letter that best extends "
                "`answer_so_far` toward that answer. Choose stop only when "
                "`answer_so_far` is already the complete answer."
            )
            character_criteria = {
                letter: f"Append '{letter}' to produce '{answer + letter}'."
                for letter in ascii_lowercase
            } | {"stop": f"Finish now and return '{answer}' as the complete answer."}
            response = await client.system_one(
                state=state,
                questions={
                    "next_character": Choice(
                        instructions=instructions,
                        criteria=character_criteria,
                    ),
                },
            )

            input_tokens += response.usage.input_tokens or 0
            output_tokens += response.usage.output_tokens or 0
            choice = response.answers["next_character"]
            top_choices = sorted( # init the list here instead of inside the condition so that we can log it later - if we stop logging this we can move this into the loop
                choice.probabilities.items(),
                key=lambda item: item[1],
                reverse=True,
            )[:RERANK_COUNT]
            reranked_top = None

            if choice.confidence < RERANK_CONFIDENCE_THRESHOLD:
                reranked_response = await client.system_one(
                    state=state,
                    questions={
                        "next_character": Choice(
                            instructions=instructions,
                            criteria={
                                character: character_criteria[character]
                                for character, _ in top_choices
                            },
                        )
                    },
                )
                input_tokens += reranked_response.usage.input_tokens or 0
                output_tokens += reranked_response.usage.output_tokens or 0
                choice = reranked_response.answers["next_character"]
                reranked_top = sorted(
                    choice.probabilities.items(),
                    key=lambda item: item[1],
                    reverse=True,
                )

            character = choice.choice

            print(
                f"iteration={iteration}/{MAX_ITERATIONS} "
                f"answer_so_far={answer!r} choice={character!r} "
                f"confidence={choice.confidence:.2f} "
                f"layer1={[(name, round(probability, 3)) for name, probability in top_choices]} "
                f"layer2={[(name, round(probability, 3)) for name, probability in reranked_top] if reranked_top else 'skipped'}",
                flush=True,
            )

            if character == "stop":
                return AutoRegressiveChatResponse(
                    answer=answer,
                    iterations=iteration,
                    stop_reason="stop",
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                )

            answer += character
    return AutoRegressiveChatResponse(
        answer=answer,
        iterations=MAX_ITERATIONS,
        stop_reason="max_iterations",
        input_tokens=input_tokens,
        output_tokens=output_tokens,
    )
