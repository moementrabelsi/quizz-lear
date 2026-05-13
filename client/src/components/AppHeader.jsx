import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function AppHeader({ title }) {
  const { user, logout, isAdmin } = useAuth();

  return (
    <header className="border-b border-lear-border bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Link to={user ? (isAdmin ? '/admin' : '/training/video') : '/login'} className="flex items-center">
            <img src="/logo.svg" alt="Lear" className="h-8 w-auto" />
          </Link>
          {title ? (
            <span className="hidden text-sm font-medium text-lear-muted sm:inline">{title}</span>
          ) : null}
        </div>
        <nav className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              {!isAdmin ? (
                <Link to="/training/video" className="text-lear-dark hover:text-lear-red">
                  Training
                </Link>
              ) : null}
              {isAdmin ? (
                <>
                  <Link to="/admin" className="text-lear-dark hover:text-lear-red">
                    Dashboard
                  </Link>
                  <Link to="/admin/analytics" className="text-lear-dark hover:text-lear-red">
                    Analytics
                  </Link>
                </>
              ) : null}
              <span className="hidden text-lear-muted md:inline">{user.email}</span>
              <button
                type="button"
                onClick={logout}
                className="rounded border border-lear-border px-3 py-1.5 font-medium text-lear-dark hover:border-lear-red hover:text-lear-red"
              >
                Log out
              </button>
            </>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
