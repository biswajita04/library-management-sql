import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  Search,
} from 'lucide-react';
import {
  filterBorrows,
  formatBorrowTimestamp,
  parsePositiveInt,
  validateBorrowInput,
  type BookWithStatus,
  type BorrowRecord,
  type Student,
} from '../lib/libraryLogic.ts';

interface BorrowListPortalProps {
  borrows: BorrowRecord[];
  students: Student[];
  books: BookWithStatus[];
  loading: boolean;
  error: string | null;
  focusRequestKey: number;
  onRetry: () => void;
  onIssueBook: (input: { usn: number; book_id: number }) => Promise<void>;
  onMarkReturned: (transactionId: number) => Promise<void>;
}

export function BorrowListPortal({
  borrows,
  students,
  books,
  loading,
  error,
  focusRequestKey,
  onRetry,
  onIssueBook,
  onMarkReturned,
}: BorrowListPortalProps) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'pending' | 'returned'
  >('all');
  const [usn, setUsn] = useState('');
  const [bookId, setBookId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [returningId, setReturningId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const usnInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusRequestKey > 0) {
      usnInputRef.current?.focus();
    }
  }, [focusRequestKey]);

  const filtered = filterBorrows(borrows, query, statusFilter);
  const pendingCount = borrows.filter((b) => !b.return_status).length;
  const returnedCount = borrows.length - pendingCount;

  const parsedUsn = parsePositiveInt(usn);
  const matchedStudent =
    parsedUsn !== null ? students.find((s) => s.usn === parsedUsn) : undefined;

  const parsedBookId = parsePositiveInt(bookId);
  const matchedBook =
    parsedBookId !== null
      ? books.find((b) => b.book_id === parsedBookId)
      : undefined;

  async function handleIssueSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const validated = validateBorrowInput({ usn, book_id: bookId });
    if (!validated.ok) {
      setFormError(validated.error);
      return;
    }

    setSubmitting(true);
    try {
      await onIssueBook(validated.data);
      setUsn('');
      setBookId('');
      setFormSuccess(
        `Issued Book ID ${validated.data.book_id} to USN ${validated.data.usn}.`
      );
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Unable to issue book.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReturnClick(transactionId: number) {
    setActionError(null);
    setReturningId(transactionId);
    try {
      await onMarkReturned(transactionId);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to mark book as returned.'
      );
    } finally {
      setReturningId(null);
    }
  }

  return (
    <section aria-labelledby="borrow-portal-heading" className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1
          id="borrow-portal-heading"
          className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900"
        >
          Borrow List
        </h1>
        <p className="text-sm text-slate-600">
          Track joined student and book circulation transactions, issue books,
          and process returns.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 bg-white border border-slate-200 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="px-6 py-4">
          <p className="text-xs font-medium text-slate-500">
            Total Transactions
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {borrows.length}
          </p>
        </div>
        <div className="px-6 py-4">
          <p className="text-xs font-medium text-slate-500">Pending Returns</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-amber-700 tabular-nums">
            {pendingCount}
          </p>
        </div>
        <div className="px-6 py-4">
          <p className="text-xs font-medium text-slate-500">Returned</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-emerald-700 tabular-nums">
            {returnedCount}
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
          <ArrowRightLeft
            aria-hidden="true"
            className="w-4 h-4 text-blue-700"
          />
          <h2 className="text-base font-semibold text-slate-900">
            Issue a Book
          </h2>
        </div>

        <form
          onSubmit={handleIssueSubmit}
          noValidate
          className="mt-4 space-y-3"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            <div className="md:col-span-4">
              <label
                htmlFor="borrow-usn"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Student USN
              </label>
              <input
                ref={usnInputRef}
                id="borrow-usn"
                name="usn"
                type="number"
                min={1}
                step={1}
                list="registered-students-list"
                required
                value={usn}
                onChange={(e) => setUsn(e.target.value)}
                placeholder="Enter or select USN"
                className="w-full h-10 px-3 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
              <datalist id="registered-students-list">
                {students.map((s) => (
                  <option
                    key={s.usn}
                    value={s.usn}
                    label={`${s.name} · ${s.department}`}
                  />
                ))}
              </datalist>
              {matchedStudent && (
                <p className="mt-1.5 text-xs text-slate-600">
                  {matchedStudent.name} · {matchedStudent.department}
                </p>
              )}
            </div>

            <div className="md:col-span-5">
              <label
                htmlFor="borrow-book-id"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Book ID
              </label>
              <input
                id="borrow-book-id"
                name="book_id"
                type="number"
                min={1}
                step={1}
                list="catalog-books-list"
                required
                value={bookId}
                onChange={(e) => setBookId(e.target.value)}
                placeholder="Enter or select Book ID"
                className="w-full h-10 px-3 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
              <datalist id="catalog-books-list">
                {books.map((b) => (
                  <option
                    key={b.book_id}
                    value={b.book_id}
                    label={`${b.book_name} (${b.is_borrowed ? 'Borrowed' : 'Available'})`}
                  />
                ))}
              </datalist>
              {matchedBook && (
                <p
                  className={`mt-1.5 text-xs ${
                    matchedBook.is_borrowed
                      ? 'text-amber-700'
                      : 'text-emerald-700'
                  }`}
                >
                  {matchedBook.book_name} ·{' '}
                  {matchedBook.is_borrowed ? 'Currently Borrowed' : 'Available'}
                </p>
              )}
            </div>

            <div className="md:col-span-3 md:pt-[22px]">
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-10 px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                {submitting ? 'Issuing Book...' : 'Issue Book'}
              </button>
            </div>
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
        </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Circulation Ledger
            </h2>
            <p className="text-xs text-slate-500 tabular-nums mt-0.5">
              Showing {filtered.length} of {borrows.length} transactions
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div
              role="group"
              aria-label="Filter by return status"
              className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
            >
              {(
                [
                  { key: 'all', label: 'All' },
                  { key: 'pending', label: 'Pending' },
                  { key: 'returned', label: 'Returned' },
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

            <div className="relative w-full sm:w-64">
              <label htmlFor="borrow-search" className="sr-only">
                Search borrow transactions
              </label>
              <Search
                aria-hidden="true"
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              />
              <input
                id="borrow-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search ID, USN, book..."
                className="w-full h-10 pl-9 pr-3 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>
          </div>
        </div>

        {actionError && (
          <div
            role="alert"
            className="px-6 py-3 bg-red-50 border-b border-red-200 text-xs font-medium text-red-700"
          >
            {actionError}
          </div>
        )}

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
                <div className="h-4 w-10 bg-slate-100 rounded" />
                <div className="h-4 w-14 bg-slate-100 rounded" />
                <div className="h-4 w-32 bg-slate-100 rounded" />
                <div className="h-4 w-40 bg-slate-100 rounded" />
                <div className="h-6 w-20 bg-slate-100 rounded-md" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-12 text-center space-y-3">
            <p className="text-sm font-medium text-slate-900">
              {borrows.length === 0
                ? 'No borrow transactions recorded'
                : 'No transactions match your filters'}
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {borrows.length === 0
                ? 'Issue a book to a registered student using the form above.'
                : 'Adjust the return status filter or search query.'}
            </p>
            {borrows.length === 0 && (
              <button
                type="button"
                onClick={() => usnInputRef.current?.focus()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 cursor-pointer"
              >
                Issue First Book
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th scope="col" className="py-3 px-6 whitespace-nowrap">
                    Transaction ID
                  </th>
                  <th scope="col" className="py-3 px-5 whitespace-nowrap">
                    USN
                  </th>
                  <th scope="col" className="py-3 px-5 whitespace-nowrap">
                    Student Name
                  </th>
                  <th scope="col" className="py-3 px-5 whitespace-nowrap">
                    Book Name
                  </th>
                  <th scope="col" className="py-3 px-5 whitespace-nowrap">
                    Borrow Time
                  </th>
                  <th scope="col" className="py-3 px-5 whitespace-nowrap">
                    Return Status
                  </th>
                  <th
                    scope="col"
                    className="py-3 px-6 text-right whitespace-nowrap"
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((row) => (
                  <tr
                    key={row.transaction_id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3 px-6 font-mono font-medium text-slate-900 tabular-nums whitespace-nowrap">
                      {row.transaction_id}
                    </td>
                    <td className="py-3 px-5 font-mono text-slate-700 tabular-nums whitespace-nowrap">
                      {row.usn}
                    </td>
                    <td className="py-3 px-5 font-medium text-slate-900 whitespace-nowrap">
                      {row.student_name}
                    </td>
                    <td className="py-3 px-5 text-slate-700">
                      {row.book_name}
                    </td>
                    <td className="py-3 px-5 text-xs font-mono text-slate-500 tabular-nums whitespace-nowrap">
                      {formatBorrowTimestamp(row.borrow_time)}
                    </td>
                    <td className="py-3 px-5 whitespace-nowrap">
                      {row.return_status ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                          <CheckCircle2
                            aria-hidden="true"
                            className="w-3.5 h-3.5"
                          />
                          Returned
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
                          <Clock aria-hidden="true" className="w-3.5 h-3.5" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-6 text-right whitespace-nowrap">
                      {!row.return_status ? (
                        <button
                          type="button"
                          disabled={returningId === row.transaction_id}
                          aria-label={`Mark Returned (Transaction #${row.transaction_id})`}
                          onClick={() => handleReturnClick(row.transaction_id)}
                          className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-60 transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1"
                        >
                          {returningId === row.transaction_id
                            ? 'Updating...'
                            : 'Mark Returned'}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
