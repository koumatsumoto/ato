import { createBrowserRouter } from "react-router";
import { AuthGuard } from "@/features/auth/components/AuthGuard";
import { LoginPage } from "@/app/pages/LoginPage";
import { MainPage } from "@/app/pages/MainPage";
import { DetailPage } from "@/app/pages/DetailPage";

export const router = createBrowserRouter(
  [
    {
      element: <AuthGuard />,
      children: [
        { path: "/", element: <MainPage /> },
        { path: "/actions/:id", element: <DetailPage /> },
      ],
    },
    { path: "/login", element: <LoginPage /> },
  ],
  { basename: import.meta.env.BASE_URL },
);
