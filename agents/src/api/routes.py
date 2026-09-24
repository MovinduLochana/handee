import logging
from fastapi import APIRouter, HTTPException
from pydantic import ValidationError
from src.schemas.contracts import (
    JobDispatchRequest,
    AssistantQueryRequest,
    AssistantQueryResponse,
    ClassifyJobCategoryInput,
    EstimateScopeInput,
)
from src.workflows.dispatch_workflow import run_dispatch_workflow
from src.workflows.assistant_workflow import process_assistant_query

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["Agents"])

# A ValidationError from one of the domain tools' input contracts means the
# client's text was unusable (e.g. a blank query). Any other ValidationError
# is a bug on our side and stays a 500.
_TOOL_INPUT_MODELS = {ClassifyJobCategoryInput.__name__, EstimateScopeInput.__name__}


@router.post("/workflow/dispatch")
async def dispatch_workflow(request: JobDispatchRequest):
    """
    Trigger 4-agent LangGraph workflow for job matching, scope estimation,
    quote calculation, and deterministic risk tier validation.
    """
    try:
        final_state = await run_dispatch_workflow(request)
        return final_state
    except Exception as e:
        logger.exception("Error executing dispatch workflow: %s", e)
        raise HTTPException(status_code=500, detail=f"Workflow execution failed: {str(e)}")


@router.post("/assistant/query", response_model=AssistantQueryResponse)
async def assistant_query(request: AssistantQueryRequest):
    """
    Customer-facing conversational assistant endpoint.
    Performs domain intent classification, provider lookup, and returns
    structured suggestions.
    """
    try:
        response = await process_assistant_query(request)
        return response
    except Exception as e:
        if isinstance(e, ValidationError) and e.title in _TOOL_INPUT_MODELS:
            raise HTTPException(
                status_code=422, detail=f"Invalid query: {e.errors()[0]['msg']}"
            ) from e
        logger.exception("Error executing assistant query: %s", e)
        raise HTTPException(status_code=500, detail=f"Assistant query failed: {str(e)}")
