import bodyRoutesSeed from "@/seed/body-routes.seed.json";

const activationRoute = bodyRoutesSeed.routes.find(
  (route) => route.name === "Body Activation Route"
);

export function getBodyActivationTemplate() {
  if (
    !activationRoute ||
    !("daily_structure" in activationRoute) ||
    !activationRoute.daily_structure ||
    !("action_library" in activationRoute) ||
    !activationRoute.action_library
  ) {
    return {
      structure: [],
      actionLibrary: {}
    };
  }

  return {
    structure: activationRoute.daily_structure,
    actionLibrary: activationRoute.action_library
  };
}

export function formatBodyActivationMethod() {
  const template = getBodyActivationTemplate();
  return template.structure
    .map((item) => `${item.start}-${item.end} ${item.segment}`)
    .join("；");
}
