import { useRef, useState, type FormEvent } from 'react';
import { Search, UserPlus } from 'lucide-react';
import {
  filterStudents,
  validateStudentInput,
  type BorrowRecord,
  type Student,
} from '../lib/libraryLogic.ts';

interface StudentPortalProps {
  students: Student[];
  borrows: BorrowRecord[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onAddStudent: (input: Student) => Promise<void>;
}

export function StudentPortal({
  students,
  borrows,
  loading,
  error,
  onRetry,
  onAddStudent,
}: StudentPortalProps) {
  const [query, setQuery] = useState('');
  const [usn, setUsn] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const usnInputRef = useRef<HTMLInputElement>(null);

  const filtered = filterStudents(students, query);
  const departmentCount = new Set(
    students.map((s) => s.department.trim().toLowerCase())
  ).size;
  const activeBorrowingStudents = new Set(
    borrows.filter((b) => !b.return_status).map((b) => b.usn)
  ).size;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const validated = validateStudentInput({ usn, name, department });
    if (!validated.ok) {
      setFormError(validated.error);
      return;
    }

    setSubmitting(true);
    try {
      await onAddStudent(validated.data);
      setUsn('');
      setName('');
      setDepartment('');
      setFormSuccess(
        `Added ${validated.data.name} (USN ${validated.data.usn}).`
      );
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Unable to add student.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section aria-labelledby="student-portal-heading" className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1
          id="student-portal-heading"
          className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900"
        >
          Student Portal
        </h1>
        <p className="text-sm text-slate-600">
          Directory of enrolled students and registration records by USN.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 bg-white border border-slate-200 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="px-6 py-4">
          <p className="text-xs font-medium text-slate-500">
            Registered Students
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {students.length}
          </p>
        </div>
        <div className="px-6 py-4">
          <p className="text-xs font-medium text-slate-500">Departments</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {departmentCount}
          </p>
        </div>
        <div className="px-6 py-4">
          <p className="text-xs font-medium text-slate-500">
            Active Borrowers
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {activeBorrowingStudents}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Student Directory
              </h2>
              <p className="text-xs text-slate-500 tabular-nums mt-0.5">
                Showing {filtered.length} of {students.length} records
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <label htmlFor="student-search" className="sr-only">
                Search students
              </label>
              <Search
                aria-hidden="true"
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              />
              <input
                id="student-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search USN, name, dept..."
                className="w-full h-10 pl-9 pr-3 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
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
                  <div className="h-4 w-16 bg-slate-100 rounded" />
                  <div className="h-4 w-40 bg-slate-100 rounded" />
                  <div className="h-4 w-32 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-12 text-center space-y-3">
              <p className="text-sm font-medium text-slate-900">
                {students.length === 0
                  ? 'No students registered yet'
                  : 'No students match your search'}
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {students.length === 0
                  ? 'Register the first student using the form on the right to start issuing books.'
                  : 'Try clearing your search filter or register a new student.'}
              </p>
              {students.length === 0 && (
                <button
                  type="button"
                  onClick={() => usnInputRef.current?.focus()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 cursor-pointer"
                >
                  Register First Student
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                    <th scope="col" className="py-3 px-6 w-28">
                      USN
                    </th>
                    <th scope="col" className="py-3 px-6">
                      Name
                    </th>
                    <th scope="col" className="py-3 px-6">
                      Department
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filtered.map((student) => (
                    <tr
                      key={student.usn}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 px-6 font-mono font-medium text-slate-900 tabular-nums">
                        {student.usn}
                      </td>
                      <td className="py-3 px-6 font-medium text-slate-900">
                        {student.name}
                      </td>
                      <td className="py-3 px-6 text-slate-600">
                        {student.department}
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
            <UserPlus aria-hidden="true" className="w-4 h-4 text-blue-700" />
            <h2 className="text-base font-semibold text-slate-900">
              Add New Student
            </h2>
          </div>

          <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="student-usn"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                USN
              </label>
              <input
                ref={usnInputRef}
                id="student-usn"
                name="usn"
                type="number"
                min={1}
                step={1}
                required
                value={usn}
                onChange={(e) => setUsn(e.target.value)}
                placeholder="e.g. 105"
                className="w-full h-10 px-3 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>

            <div>
              <label
                htmlFor="student-name"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Full Name
              </label>
              <input
                id="student-name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Elena Vance"
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>

            <div>
              <label
                htmlFor="student-department"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Department
              </label>
              <input
                id="student-department"
                name="department"
                type="text"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Computer Science"
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
              {submitting ? 'Adding Student...' : 'Add Student'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
