import { useCallback, useEffect, useState } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { StudentPortal } from './components/StudentPortal.tsx';
import { BookPortal } from './components/BookPortal.tsx';
import { BorrowListPortal } from './components/BorrowListPortal.tsx';
import {
  createBook,
  createStudent,
  fetchBooks,
  fetchBorrows,
  fetchStudents,
  issueBorrow,
  returnBorrow,
} from './lib/api.ts';
import {
  normalizePortalPath,
  type Book,
  type BookWithStatus,
  type BorrowRecord,
  type PortalRoute,
  type Student,
} from './lib/libraryLogic.ts';

export default function App() {
  const [route, setRoute] = useState<PortalRoute>(() =>
    normalizePortalPath(window.location.pathname)
  );
  const [focusBorrowKey, setFocusBorrowKey] = useState(0);

  const [students, setStudents] = useState<Student[]>([]);
  const [books, setBooks] = useState<BookWithStatus[]>([]);
  const [borrows, setBorrows] = useState<BorrowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [studentsRes, booksRes, borrowsRes] = await Promise.all([
        fetchStudents(),
        fetchBooks(),
        fetchBorrows(),
      ]);
      setStudents(studentsRes.students);
      setBooks(booksRes.books);
      setBorrows(borrowsRes.borrows);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load library data from server.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (window.location.pathname === '/') {
      window.history.replaceState(null, '', '/student');
    }

    const handlePopState = () => {
      setRoute(normalizePortalPath(window.location.pathname));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleNavigate = useCallback(
    (nextRoute: PortalRoute, options?: { focusForm?: boolean }) => {
      if (window.location.pathname !== nextRoute) {
        window.history.pushState(null, '', nextRoute);
      }
      setRoute(nextRoute);
      if (nextRoute === '/borrowlist' && options?.focusForm) {
        setFocusBorrowKey((k) => k + 1);
      }
      void loadAll();
    },
    [loadAll]
  );

  const handleAddStudent = useCallback(
    async (input: Student) => {
      await createStudent(input);
      const res = await fetchStudents();
      setStudents(res.students);
    },
    []
  );

  const handleAddBook = useCallback(async (input: Book) => {
    await createBook(input);
    const res = await fetchBooks();
    setBooks(res.books);
  }, []);

  const handleIssueBook = useCallback(
    async (input: { usn: number; book_id: number }) => {
      await issueBorrow(input);
      const [booksRes, borrowsRes] = await Promise.all([
        fetchBooks(),
        fetchBorrows(),
      ]);
      setBooks(booksRes.books);
      setBorrows(borrowsRes.borrows);
    },
    []
  );

  const handleMarkReturned = useCallback(async (transactionId: number) => {
    await returnBorrow(transactionId);
    const [booksRes, borrowsRes] = await Promise.all([
      fetchBooks(),
      fetchBorrows(),
    ]);
    setBooks(booksRes.books);
    setBorrows(borrowsRes.borrows);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar currentRoute={route} onNavigate={handleNavigate} />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {route === '/student' && (
          <StudentPortal
            students={students}
            borrows={borrows}
            loading={loading}
            error={error}
            onRetry={() => void loadAll()}
            onAddStudent={handleAddStudent}
          />
        )}

        {route === '/book' && (
          <BookPortal
            books={books}
            loading={loading}
            error={error}
            onRetry={() => void loadAll()}
            onAddBook={handleAddBook}
          />
        )}

        {route === '/borrowlist' && (
          <BorrowListPortal
            borrows={borrows}
            students={students}
            books={books}
            loading={loading}
            error={error}
            focusRequestKey={focusBorrowKey}
            onRetry={() => void loadAll()}
            onIssueBook={handleIssueBook}
            onMarkReturned={handleMarkReturned}
          />
        )}
      </main>
    </div>
  );
}
