// Navbar.tsx
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Pen, Layout, LogOut } from "lucide-react";
import { cn } from "../lib/utils";

interface NavbarProps {
  isAuthenticated: boolean;
  setIsAuthenticated: (value: boolean) => void;
}

export default function Navbar({ isAuthenticated, setIsAuthenticated }: NavbarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    setIsAuthenticated(false);
    navigate("/login");
  };

  const links = [
    { href: "/", label: "Topics", icon: Pen },
    // { href: "/editor/:topicId", label: "Webpage Editor", icon: Layout, disabled: false }, // Enable Webpage Editor
  ];

  return (
    <nav className="bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            {isAuthenticated &&
              links.map(({ href, label, icon: Icon, disabled }) => (
                <Link
                  key={href}
                  to={href}
                  className={cn(
                    "flex items-center space-x-2 text-sm font-medium transition-colors",
                    location.pathname === href
                      ? "text-blue-600"
                      : "text-gray-600 hover:text-blue-600",
                    disabled && "pointer-events-none opacity-50"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </Link>
              ))}
          </div>
          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-sm font-medium text-gray-600 hover:text-blue-600"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}