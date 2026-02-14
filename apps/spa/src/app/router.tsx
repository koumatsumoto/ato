import { createBrowserRouter } from "react-router";
import { AuthGuard } from "@/features/auth/components/AuthGuard";
import { LoginPage } from "@/app/pages/LoginPage";
import { MainPage } from "@/app/pages/MainPage";
import { DetailPage } from "@/app/pages/DetailPage";
import { SharePage } from "@/app/pages/SharePage";

export const router = createBrowserRouter(
  [
    {
      element: <AuthGuard />,
      children: [
        { path: "/", element: <MainPage /> },
        { path: "/actions/:id", element: <DetailPage /> },
        { path: "/share", element: <SharePage /> },
      ],
    },
    { path: "/login", element: <LoginPage /> },
  ],
  { basename: import.meta.env.BASE_URL },
);
