import type { Request, Response } from 'express';
import type { AutonomousPlanRequest } from 'autonomous-agent-contracts';
import { planAutonomousGoal } from 'autonomous-test-agent';

function isPlanRequest(body: unknown): body is AutonomousPlanRequest {
  if (!body || typeof body !== 'object') return false;
  const value = body as Partial<AutonomousPlanRequest>;
  return typeof value.goal === 'string' && value.goal.trim().length > 0;
}

export function postAutonomousPlan(req: Request, res: Response): void {
  if (!isPlanRequest(req.body)) {
    res.status(400).json({
      status: 'error',
      error: 'Invalid AutonomousPlanRequest — goal (string) is required',
    });
    return;
  }

  try {
    const response = planAutonomousGoal(req.body);
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
