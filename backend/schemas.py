from typing import Literal

from pydantic import BaseModel, Field


class RobotSituation(BaseModel):
    situation: str = Field(min_length=1, max_length=2_000)


class AutoRegressiveChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2_000)


class AutoRegressiveChatResponse(BaseModel):
    answer: str
    iterations: int
    stop_reason: Literal["stop", "max_iterations"]
    input_tokens: int
    output_tokens: int
