# BookStack: Black-Box and White-Box Testing Demo Guide for TAs

## 1. Start BookStack

Open PowerShell and run:

```powershell
cd applications\bookstack
npm.cmd ci --include=dev --include=optional
.\start.bat --port auto
```

The dependency installation may take a few minutes. When it finishes, `start.bat` checks the application and automatically selects an available port. Look for a message similar to:

```text
Starting BookStack at http://127.0.0.1:3000
```

Open the **exact URL printed in the terminal** in your browser. The port may not be `3000`. Keep the PowerShell window open while you use BookStack.

If the application reports that dependencies are missing, run the installation command again, then restart BookStack with `.\start.bat --port auto`.

## 2. Log In and Create the First Book

1. Click **Login** in the upper-right corner.
2. Enter the following credentials:
   - Email: `bookstack_user@example.com`
   - Password: `Password123!`
3. Leave **Remember Me** at its default setting; it does not affect this demonstration.
4. Click **Login** on the login form.
5. From the top navigation bar, go to **Books → Create New Book**.
6. Enter these values:

   | Field | Value |
   |---|---|
   | Name | Course |
   | Description | Testing |
   | Tags | testing |

7. Click **Save Book**.
8. Copy the full URL from your browser’s address bar and save it in a note as **First book URL**. It may look like `http://127.0.0.1:3000/books/1`; the port and number may differ on your computer.

The book details page should show a **Favorite** button on the right-hand side.

## 3. Black-Box Test: A Favorited Book Disappears from Recently Viewed

For this test, observe the behavior through the BookStack interface. Do not inspect the source code yet.

| Step | Action | What to observe |
|---|---|---|
| 1 | Click **BookStack Demo** in the top navigation bar to return to the home page. | The **Course** book appears in **My Recently Viewed**. |
| 2 | Click **Course** in **My Recently Viewed**. | The book details page opens normally. |
| 3 | Click **Favorite** on the right-hand side. | The button changes to **Unfavorite**. |
| 4 | Return to the home page. If the sections have not updated, press **F5** or click the browser’s refresh button. | Check **My Recently Viewed**. The book may disappear from there and appear in **My Most Viewed Favorites**. |
| 5 | Open the book from the favorites section and click **Unfavorite**. | The button changes back to **Favorite**. |
| 6 | Return to the home page. Refresh if needed. | The book reappears in **My Recently Viewed**. |

**Expected behavior:** Favoriting or unfavoriting a book should not remove it from recently viewed history.

**Fault evidence:** The number of entries for the same book in **My Recently Viewed** changes from **1 → 0 → 1**.

When observing the result, focus on **My Recently Viewed**. Seeing the book under favorites does not show that recently viewed history is working correctly.

## 4. Prepare for the White-Box Test

1. Open the **Course** book.
2. Click **Favorite**.
3. Confirm the button changes to **Unfavorite**.
4. Copy the full URL from the browser’s address bar again and save it as **First book URL**. This is the URL you will compare with the second creation.

**Do not create the second book yet.** First inspect the source code and decide what result you expect.

Reading the code now does not change the black-box nature of the first test. The next test is a white-box test because you will use information from the source code to choose its inputs before running it.

## 5. Your Task: Design the White-Box Test

Open this file in your code editor:

```text
applications/bookstack/backend/src/slices/bookstack.ts
```

Find the statement below. In the supplied version, it is on line 113. It is an **early-return branch**: if `existing` is true, the function returns that book immediately instead of continuing to create a book.

```typescript
if (existing) return existing;
```

Inspect the database query immediately before that statement:

```typescript
const existing = db.prepare(
  `SELECT * FROM books WHERE name = ? AND description = ? AND tags = ?
   AND ((shelf_id IS NULL AND ? IS NULL) OR shelf_id = ?)
   ORDER BY id ASC LIMIT 1`
).get(name, description, tags, shelfId, shelfId);

if (existing) return existing;
```

The query looks for a book with the same **name**, **description**, **tags**, and **shelf**. Matching the name alone is not enough. Creating both books from the global **Books** page means neither book is assigned to a shelf, so both shelf values will be null.

This is a manual test: you will use the interface to enter the values and observe the result. You will not write or change code.

Before creating the second book, write down your prediction:

> **Expected behavior:** Two independent book creation operations should create two distinct book objects with different book IDs, even when all their field values are identical.

The code gives you a hypothesis about what may happen. The expected behavior comes from the requirement that each separate creation operation should create a distinct book. Keep your expected result written down so you can compare it with what happens.

## 6. Execute the White-Box Test: Create a Second Book

1. Click **Books** in the top navigation bar.
2. Click **Create New Book** to open a new creation form. Do not edit the existing book.
3. Enter the same values as before:

   | Field | Value |
   |---|---|
   | Name | Course |
   | Description | Testing |
   | Tags | testing |

4. Click **Save Book**.
5. Compare the full URL in the browser’s address bar with the saved **First book URL**. Check the favorite button as well.
6. Return to **Books** and check how many **Course** entries appear.

**Actual observations:**

- The URL is identical to the **First book URL**.
- The page displays **Unfavorite**, even though you just completed a new creation operation.
- The Books page shows only one **Course** entry.

Discuss these questions:

- Why is the second book already marked as a favorite?
- Was favorite state shared between two books, or was a second book never created?
- How do the URL and the number of entries help you decide?

**Fault evidence:** Two independent creation operations resulted in only one book object, rather than two distinct books.

This was not a double-click on **Save Book** or a network retry. You opened a separate creation form, entered the values, and saved it as a second operation.

Compare the actual observations with your written prediction. The matching URL, existing favorite state, and single **Course** entry are consistent with the code-guided hypothesis that the early-return branch returned the existing book.

## 7. End the Demonstration

Return to the PowerShell window running BookStack and press **Ctrl+C** to stop the application.
