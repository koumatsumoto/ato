import { RouterProvider } from "react-router";
import { AppProviders } from "./providers";
import { router } from "./router";

export function App(): React.JSX.Element {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
