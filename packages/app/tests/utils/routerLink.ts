// In tests, RouterLinkStub.props().to is RouteLocationRaw which is a union with `string`.
// All call sites pass named-route objects, so flatten to that shape for ergonomic access.
export type ObjectRouteLocation = {
  name?: string;
  path?: string;
  params?: Record<string, string | number | string[]>;
  query?: Record<string, string | number | string[]>;
  hash?: string;
};

// Read RouterLinkStub's `to` prop as the named-route object form.
// Pass a wrapper that *is* the stub (from `findComponent(RouterLinkStub)` or
// `findAllComponents(RouterLinkStub)[i]`).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const linkTo = (stub: { props(): { to: any } }): ObjectRouteLocation => stub.props().to as ObjectRouteLocation;
