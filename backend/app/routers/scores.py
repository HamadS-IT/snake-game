from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.score import Score
from app.models.user import User
from app.schemas.score import LeaderboardEntry, MyScoresOut, ScoreCreate, ScoreOut

router = APIRouter()


@router.post("", response_model=ScoreOut, status_code=status.HTTP_201_CREATED)
def submit_score(
    payload: ScoreCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    score = Score(
        user_id=current_user.id,
        points=payload.points,
        level_reached=payload.level_reached,
    )
    db.add(score)
    db.commit()
    db.refresh(score)
    return score


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
def leaderboard(
    limit: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # One row per user: each player's personal-best score, ranked highest first.
    best_per_user = (
        db.query(Score.user_id, func.max(Score.points).label("best_points"))
        .group_by(Score.user_id)
        .subquery()
    )

    top_users = (
        db.query(User.id, User.username, best_per_user.c.best_points)
        .join(best_per_user, User.id == best_per_user.c.user_id)
        .order_by(desc(best_per_user.c.best_points))
        .limit(limit)
        .all()
    )

    entries = []
    for user_id, username, best_points in top_users:
        best_row = (
            db.query(Score)
            .filter(Score.user_id == user_id, Score.points == best_points)
            .order_by(desc(Score.created_at))
            .first()
        )
        entries.append(
            LeaderboardEntry(
                username=username,
                points=best_points,
                level_reached=best_row.level_reached,
                created_at=best_row.created_at,
            )
        )
    return entries


@router.get("/me", response_model=MyScoresOut)
def my_scores(
    limit: int = Query(default=10, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    base_query = db.query(Score).filter(Score.user_id == current_user.id)
    total = base_query.count()
    best = (
        db.query(func.max(Score.points))
        .filter(Score.user_id == current_user.id)
        .scalar()
        or 0
    )
    history = (
        base_query.order_by(desc(Score.created_at)).offset(offset).limit(limit).all()
    )
    return MyScoresOut(best=best, total=total, history=history)
