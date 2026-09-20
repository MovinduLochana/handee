from fastapi import APIRouter

router = APIRouter(prefix="/api/v1", tags=["Agents"])


@router.post("/workflow/dispatch")
async def dispatch_workflow():
    """Trigger agent workflow for job matching and quote validation (stub)."""
    raise NotImplementedError("Agent workflow dispatch to be implemented")


@router.post("/assistant/query")
async def assistant_query():
    """Customer-facing conversational assistant endpoint (stub)."""
    raise NotImplementedError("Customer assistant query to be implemented")
