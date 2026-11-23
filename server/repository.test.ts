import test from 'node:test';
import assert from 'node:assert/strict';
import { HttpError, MemoryLibraryRepository } from './repository.ts';

test('MemoryLibraryRepository enforces student, book, borrow, and return lifecycle', async () => {
  const repo = new MemoryLibraryRepository();

  const initialBooks = await repo.listBooks();
  const book501 = initialBooks.find((b) => b.book_id === 501);
  assert.equal(book501?.is_borrowed, true);

  await repo.addStudent({
    usn: 199,
    name: 'Elena Vance',
    department: 'Data Science',
  });
  await repo.addBook({
    book_id: 599,
    book_name: 'Designing Data-Intensive Applications',
    author: 'Martin Kleppmann',
  });

  const booksAfterAdd = await repo.listBooks();
  const book599 = booksAfterAdd.find((b) => b.book_id === 599);
  assert.equal(book599?.is_borrowed, false);

  await assert.rejects(
    () => repo.addStudent({ usn: 199, name: 'Duplicate', department: 'CS' }),
    (err: unknown) => err instanceof HttpError && err.status === 409
  );

  const issued = await repo.issueBook({ usn: 199, book_id: 599 });
  assert.equal(issued.return_status, false);
  assert.equal(issued.student_name, 'Elena Vance');
  assert.equal(issued.book_name, 'Designing Data-Intensive Applications');

  const booksWhileBorrowed = await repo.listBooks();
  assert.equal(
    booksWhileBorrowed.find((b) => b.book_id === 599)?.is_borrowed,
    true
  );

  await assert.rejects(
    () => repo.issueBook({ usn: 101, book_id: 599 }),
    (err: unknown) => err instanceof HttpError && err.status === 409
  );

  const returned = await repo.markReturned(issued.transaction_id);
  assert.equal(returned.return_status, true);

  const booksAfterReturn = await repo.listBooks();
  assert.equal(
    booksAfterReturn.find((b) => b.book_id === 599)?.is_borrowed,
    false
  );
});
