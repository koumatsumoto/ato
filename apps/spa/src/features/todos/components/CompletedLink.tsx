import { Link } from "react-router";

export function CompletedLink() {
  return (
    <div className="mt-8 text-center">
      <Link to="/completed" className="text-sm text-gray-400 hover:text-gray-600">
        View completed todos
      </Link>
    </div>
  );
}
