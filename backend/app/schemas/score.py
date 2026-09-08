from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ScoreCreate(BaseModel):
    points: int
    level_reached: int = 1


class ScoreOut(BaseModel):
    id: int
    points: int
    level_reached: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LeaderboardEntry(BaseModel):
    username: str
    points: int
    level_reached: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MyScoresOut(BaseModel):
    best: int
    total: int
    history: list[ScoreOut]
