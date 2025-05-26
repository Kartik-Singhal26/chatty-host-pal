
import { HomeIcon, Settings, Brain } from "lucide-react";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import AdminTraining from "./pages/AdminTraining";

export const navItems = [
  {
    title: "Home",
    to: "/",
    icon: <HomeIcon className="h-4 w-4" />,
    page: <Index />,
  },
  {
    title: "Admin",
    to: "/admin",
    icon: <Settings className="h-4 w-4" />,
    page: <Admin />,
  },
  {
    title: "Admin Training",
    to: "/admin-training",
    icon: <Brain className="h-4 w-4" />,
    page: <AdminTraining />,
  },
];
