import { createBrowserRouter } from "react-router";
import { AuthGuard } from "@/features/auth/components/AuthGuard";
import { LoginPage } from "@/app/pages/LoginPage";
import { MainPage } from "@/app/pages/MainPage";
import { DetailPage } from "@/app/pages/DetailPage";
import { CompletedPage } from "@/app/pages/CompletedPage";

export const router = createBrowserRouter(
  [
    {
      element: <AuthGuard />,
      children: [
        { path: "/", element: <MainPage /> },
        { path: "/todos/:id", element: <DetailPage /> },
        { path: "/completed", element: <CompletedPage /> },
      ],
    },
    { path: "/login", element: <LoginPage /> },
  ],
  { basename: import.meta.env.BASE_URL },
);
