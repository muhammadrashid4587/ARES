export type ActionType = "NOTIFY_BYSTANDER" | "DISPATCH_DRONE" | "ALERT_EMS";

export type NotifyBystanderAction = Readonly<{
  type: "NOTIFY_BYSTANDER";
  payload: Readonly<{
    incidentId: string;
    bystanderInstructions: ReadonlyArray<string>;
  }>;
}>;

export type DispatchDroneAction = Readonly<{
  type: "DISPATCH_DRONE";
  payload: Readonly<{
    incidentId: string;
  }>;
}>;

export type AlertEmsAction = Readonly<{
  type: "ALERT_EMS";
  payload: Readonly<{
    incidentId: string;
  }>;
}>;

export type AresAction = NotifyBystanderAction | DispatchDroneAction | AlertEmsAction;

export type ResponsePlan = Readonly<{
  incidentId: string;
  actions: ReadonlyArray<AresAction>;
}>;

export type TriageDecisionLike = Readonly<{
  dispatchDrone: boolean;
  bystanderInstructions: ReadonlyArray<string>;
}>;

export function buildResponsePlan(
  incidentId: string,
  triageDecision: TriageDecisionLike
): ResponsePlan {
  const actions: AresAction[] = [
    {
      type: "NOTIFY_BYSTANDER",
      payload: {
        incidentId,
        bystanderInstructions: [...triageDecision.bystanderInstructions]
      }
    }
  ];

  if (triageDecision.dispatchDrone === true) {
    actions.push({
      type: "DISPATCH_DRONE",
      payload: { incidentId }
    });
  }

  actions.push({
    type: "ALERT_EMS",
    payload: { incidentId }
  });

  return { incidentId, actions };
}
  