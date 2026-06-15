import type { AutonomousPlanRequest, AutonomousPlanResponse, AutonomousPlannedStep } from 'autonomous-agent-contracts';
import { checkoutJourneySteps, loginSteps, productsSteps } from './checkout-planner';
import { isCheckoutGoal, isLoginGoal, isPlaceOrderGoal, isProductsGoal, parseLoginCredentials } from './goal-parser';

function unsupportedPlan(goal: string): AutonomousPlannedStep[] {
  return [
    {
      id: 'fail-unsupported',
      action: {
        type: 'fail',
        reason: `Mock planner does not understand this goal yet: "${goal.slice(0, 120)}"`,
      },
      reasoning: 'Phase 9 supports login, products, add-to-cart, and checkout goals.',
    },
  ];
}

function withStartNavigate(steps: AutonomousPlannedStep[], startUrl?: string): AutonomousPlannedStep[] {
  if (!startUrl) return steps;
  const first = steps[0];
  if (first?.action.type === 'navigate' && first.action.url === startUrl) {
    return steps;
  }
  return [
    {
      id: 'navigate-start',
      action: { type: 'navigate', url: startUrl },
      reasoning: `Navigate to start URL ${startUrl}.`,
    },
    ...steps,
  ];
}

function loginOnlyPlan(creds: { email: string; password: string }): AutonomousPlannedStep[] {
  return [
    ...loginSteps(creds),
    {
      id: 'complete',
      action: { type: 'complete', message: 'Login goal completed successfully.' },
      reasoning: 'Goal satisfied — user left login page.',
    },
  ];
}

function productsOnlyPlan(creds: { email: string; password: string }): AutonomousPlannedStep[] {
  return [
    ...loginSteps(creds),
    ...productsSteps(),
    {
      id: 'complete',
      action: { type: 'complete', message: 'Products catalog goal completed.' },
      reasoning: 'Goal satisfied — products page verified.',
    },
  ];
}

/**
 * Mock autonomous planner — deterministic plans for Nova Retail journeys (Phase 8–9).
 */
export function planAutonomousGoalMock(request: AutonomousPlanRequest): AutonomousPlanResponse {
  const goal = request.goal.trim();
  const creds = parseLoginCredentials(goal);

  if (creds && isCheckoutGoal(goal)) {
    const steps = withStartNavigate(checkoutJourneySteps(goal, true, creds), request.startUrl);
    return {
      goal,
      planner: 'mock-autonomous-planner-v2',
      steps,
      reasoning: `Built checkout journey (${steps.length} steps)${isPlaceOrderGoal(goal) ? ' including place order' : ''}.`,
    };
  }

  if (creds && isProductsGoal(goal)) {
    const steps = withStartNavigate(productsOnlyPlan(creds), request.startUrl);
    return {
      goal,
      planner: 'mock-autonomous-planner-v2',
      steps,
      reasoning: `Built products browse journey for ${creds.email}.`,
    };
  }

  if (creds && isLoginGoal(goal)) {
    const steps = withStartNavigate(loginOnlyPlan(creds), request.startUrl);
    return {
      goal,
      planner: 'mock-autonomous-planner-v2',
      steps,
      reasoning: `Parsed login credentials for ${creds.email} and built ${steps.length} step plan.`,
    };
  }

  return {
    goal,
    planner: 'mock-autonomous-planner-v2',
    steps: unsupportedPlan(goal),
    reasoning: 'Could not parse a supported goal from natural language input.',
  };
}

/** @deprecated Use planAutonomousGoalMock or planAutonomousGoalAsync */
export const planAutonomousGoal = planAutonomousGoalMock;
