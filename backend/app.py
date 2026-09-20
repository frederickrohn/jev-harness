import os
from dotenv import load_dotenv

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typesafe_sdk import AsyncTypeSafeClient, Choice

 # in prod this is not needed because we inject env variables directly into process env but for local this is needed
load_dotenv()

api_key = os.getenv("JEV_SECRET_API_KEY")
app = FastAPI(title="Jev Warehouse Robot")


class RobotSituation(BaseModel):
    situation: str


@app.post("/decide")
async def decide(body: RobotSituation):
    if not api_key:
        raise HTTPException(status_code=500, detail="JEV_SECRET_API_KEY is not set")

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
