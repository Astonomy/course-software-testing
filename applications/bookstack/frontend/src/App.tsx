import { useRoutes } from "react-router-dom";
import { Shell } from "./foundation/Shell";
import { sliceRoutes } from "./slices/index";

export function App() {
  const page = useRoutes([...sliceRoutes, { path: "*", element: <main><h1>Page not found</h1></main> }]);
  return <Shell>{page}</Shell>;
}
