import { useRef, useState, type FormEvent } from 'react';
import { BookPlus, CheckCircle2, Clock, Search } from 'lucide-react';
import {
  filterBooks,
  validateBookInput,
  type Book,
  type BookWithStatus,
} from '../lib/libraryLogic.ts';

interface BookPortalProps {
  books: BookWithStatus[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onAddBook: (input: Book) => Promise<void>;
}

export function BookPortal({
  books,
  loading,
  error,
  onRetry,
  onAddBook,
}: BookPortalProps) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'available' | 'borrowed'
  >('all');
  const [bookId, setBookId] = useState('');
  const [bookName, setBookName] = useState('');
  const [author, setAuthor] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const bookIdInputRef = useRef<HTMLInputElement>(null);

  const filtered = filterBooks(books, query, statusFilter);
  const borrowedCount = books.filter((b) => b.is_borrowed).length;
  const availableCount = books.length - borrowedCount;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const validated = validateBookInput({
      book_id: bookId,
      book_name: bookName,
      author,
    });
    if (!validated.ok) {
      setFormError(validated.error);
      return;
    }

    setSubmitting(true);
    try {
      await onAddBook(validated.data);
      setBookId('');
      setBookName('');
      setAuthor('');
      setFormSuccess(
        `Cataloged "${validated.data.book_name}" (ID ${validated.data.book_id}).`
      );
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to add book.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section aria-labelledby="book-portal-heading" className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1
          id="book-portal-heading"
          className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900"
        >
          Book Portal
        </h1>
        <p className="text-sm text-slate-600">
          Catalog titles and inspect live circulation availability across the
          collection.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 bg-white border border-slate-200 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="px-6 py-4">
          <p className="text-xs font-medium text-slate-500">Total Titles</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {books.length}
          </p>
        </div>
        <div className="px-6 py-4">
          <p className="text-xs font-medium text-slate-500">Available Now</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-emerald-700 tabular-nums">
            {availableCount}
          </p>
        </div>
        <div className="px-6 py-4">
          <p className="text-xs font-medium text-slate-500">
            Currently Borrowed
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold text-amber-700 tabular-nums">
            {borrowedCount}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Book Catalog
              </h2>
              <p className="text-xs text-slate-500 tabular-nums mt-0.5">
                Showing {filtered.length} of {books.length} books
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div
                role="group"
                aria-label="Filter by availability"
                className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
              >
                {(
                  [
                    { key: 'all', label: 'All' },
                    { key: 'available', label: 'Available' },
                    { key: 'borrowed', label: 'Borrowed' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    aria-pressed={statusFilter === opt.key}
                    onClick={() => setStatusFilter(opt.key)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      statusFilter === opt.key
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-56">
                <label htmlFor="book-search" className="sr-only">
                  Search books
                </label>
                <Search
                  aria-hidden="true"
                  className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                />
                <input
                  id="book-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search ID, title, author..."
                  className="w-full h-10 pl-9 pr-3 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>
            </div>
          </div>

          {error ? (
            <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-red-50/60">
              <p className="text-sm text-red-700">{error}</p>
              <button
                type="button"
                onClick={onRetry}
                className="px-4 py-2 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 cursor-pointer shrink-0"
              >
                Retry
              </button>
            </div>
          ) : loading ? (
            <div className="divide-y divide-slate-100">
              {[0, 1, 2, 3].map((row) => (
                <div
                  key={row}
                  className="px-6 py-3.5 flex items-center justify-between gap-4 animate-pulse"
                >
                  <div className="h-4 w-14 bg-slate-100 rounded" />
                  <div className="h-4 w-48 bg-slate-100 rounded" />
                  <div className="h-4 w-32 bg-slate-100 rounded" />
                  <div className="h-6 w-20 bg-slate-100 rounded-md" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-12 text-center space-y-3">
              <p className="text-sm font-medium text-slate-900">
                {books.length === 0
                  ? 'No books in catalog yet'
                  : 'No books match your filters'}
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {books.length === 0
                  ? 'Add your first book using the form on the right.'
                  : 'Adjust the status filter or search query to see matching titles.'}
              </p>
              {books.length === 0 && (
                <button
                  type="button"
                  onClick={() => bookIdInputRef.current?.focus()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 cursor-pointer"
                >
                  Add First Book
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                    <th scope="col" className="py-3 px-6 w-28">
                      Book ID
                    </th>
                    <th scope="col" className="py-3 px-6">
                      Book Name
                    </th>
                    <th scope="col" className="py-3 px-6">
                      Author
                    </th>
                    <th scope="col" className="py-3 px-6 w-36">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filtered.map((book) => (
                    <tr
                      key={book.book_id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 px-6 font-mono font-medium text-slate-900 tabular-nums">
                        {book.book_id}
                      </td>
                      <td className="py-3 px-6 font-medium text-slate-900">
                        {book.book_name}
                      </td>
                      <td className="py-3 px-6 text-slate-600">
                        {book.author}
                      </td>
                      <td className="py-3 px-6">
                        {book.is_borrowed ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
                            <Clock aria-hidden="true" className="w-3.5 h-3.5" />
                            Borrowed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                            <CheckCircle2
                              aria-hidden="true"
                              className="w-3.5 h-3.5"
                            />
                            Available
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
            <BookPlus aria-hidden="true" className="w-4 h-4 text-blue-700" />
            <h2 className="text-base font-semibold text-slate-900">
              Add New Book
            </h2>
          </div>

          <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="book-id"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Book ID
              </label>
              <input
                ref={bookIdInputRef}
                id="book-id"
                name="book_id"
                type="number"
                min={1}
                step={1}
                required
                value={bookId}
                onChange={(e) => setBookId(e.target.value)}
                placeholder="e.g. 505"
                className="w-full h-10 px-3 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>

            <div>
              <label
                htmlFor="book-name"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Book Name
              </label>
              <input
                id="book-name"
                name="book_name"
                type="text"
                required
                value={bookName}
                onChange={(e) => setBookName(e.target.value)}
                placeholder="e.g. Clean Code"
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>

            <div>
              <label
                htmlFor="book-author"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Author
              </label>
              <input
                id="book-author"
                name="author"
                type="text"
                required
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Robert C. Martin"
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>

            {formError && (
              <p
                role="alert"
                className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
              >
                {formError}
              </p>
            )}

            {formSuccess && (
              <p
                role="status"
                className="text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2"
              >
                {formSuccess}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-10 px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              {submitting ? 'Adding Book...' : 'Add Book'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
