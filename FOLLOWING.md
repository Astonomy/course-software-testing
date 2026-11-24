# BookStack: Black-Box and White-Box Testing Demo Guide for TAs

## 1. Start BookStack

Open PowerShell and run:

```powershell
cd applications\bookstack
.\start.bat --port auto
```

The launcher checks dependencies, builds the application, and automatically selects an available port. Look for an output similar to:

```text
Starting BookStack at http://127.0.0.1:3000
```

Open the actual URL printed in the terminal. The port is not necessarily 3000. Keep this terminal running throughout the demonstration.

If npm dependencies are missing, install them manually and restart the application:

```powershell
npm.cmd ci --include=dev --include=optional
.\start.bat --port auto
```

## 2. Log In and Create the First Book

1. Click **Login** in the upper-right corner.
2. Enter the following credentials:
   - Email: `bookstack_user@example.com`
   - Password: `Password123!`
3. Click **Login** on the login form.
4. Navigate to **Books → Create New Book** using the top navigation bar.
5. Enter the following values exactly as specified. The same values will be used when creating the second book later.

   | Field | Value |
   | --- | --- |
   | Name | Course |
   | Description | Testing |
   | Tags | testing |

6. Click **Save Book**.
7. Record the URL of the book details page.

At this point, the book has been viewed, and the **Favorite** button should appear on the right-hand side.

## 3. Black-Box Testing: A Favorited Book Disappears from Recently Viewed

| Step | Action | Actual Observation |
| --- | --- | --- |
| 1 | Click **BookStack Demo** in the top navigation bar to return to the home page. | Course Handbook appears in **My Recently Viewed**. |
| 2 | Click the entry to open the book details page. | The book opens normally. |
| 3 | Click **Favorite** on the right-hand side. | The button changes to **Unfavorite**. |
| 4 | Return to the home page and press F5 to refresh. | The book disappears from **My Recently Viewed** but appears in **My Most Viewed Favorites**. |
| 5 | Open the book from the favorites section and click **Unfavorite**. | The book is successfully removed from favorites. |
| 6 | Return to the home page and press F5 to refresh. | The book reappears in **My Recently Viewed**. |

**Expected Behavior:** Adding or removing a book from favorites should not remove it from the recently viewed history.

**Fault Evidence:** The number of entries corresponding to the same book in the recently viewed section changes from **1 → 0 → 1**.

When observing the results, focus specifically on the **My Recently Viewed** section. The book's presence in the favorites section does not indicate that the recently viewed functionality is working correctly.

## 4. Prepare for the White-Box Testing Demo

Add the first book back to favorites:

1. Open **Course Handbook**.
2. Click **Favorite**.
3. Confirm that the button changes to **Unfavorite**.
4. Record its details page URL again as the URL of the first book.

This preparation provides supporting evidence for the later identity check. Do not execute the second creation yet. First inspect the source code and design the test inputs in Section 5.

Reading code to explain the first observed failure is debugging; it does not reclassify the original black-box test. The next test is white-box because its inputs are derived from an internal branch before execution.

## 5. Design the White-Box Test from the Source Code

Open the following file in your code editor:

```text
applications/bookstack/backend/src/slices/bookstack.ts
```

Locate the following statement:

```typescript
if (existing) return existing;
```

The preceding database query compares the book's name, description, tags, and associated shelf:

```typescript
const existing = db.prepare(
  `SELECT * FROM books WHERE name = ? AND description = ? AND tags = ?
   AND ((shelf_id IS NULL AND ? IS NULL) OR shelf_id = ?)
   ORDER BY id ASC LIMIT 1`
).get(name, description, tags, shelfId, shelfId);

if (existing) return existing;
```

Before running the second creation, derive inputs that enter the early-return branch: match the name, description, tags, and shelf. Matching the name alone is not sufficient. Create both books from the global Books page so both shelf values are null.

Write the expected result before execution: two independent creation actions should return different book IDs. The source code guides input selection; the requirements and reference behavior determine the expected result. Now execute the steps in the next section.

**Code-guided hypothesis:** With matching metadata, this branch may return the old object instead of creating a distinct book. The next section tests that hypothesis.

**Question to ask after execution:**

> Why is the second book already marked as a favorite? Is the favorite state incorrectly shared between two books, or was the second book never created in the first place?

## 6. Execute the White-Box Test: Creating a Second Book Reuses the First Book

1. Click **Books** in the top navigation bar.
2. Click **Create New Book**. Make sure to open a new creation form rather than editing the existing book.
3. Enter exactly the same values as before:

   | Field | Value |
   | --- | --- |
   | Name | Course |
   | Description | Testing |
   | Tags | testing |

4. Click **Save Book**.
5. Inspect the browser's address bar and the favorite button.

**Actual Observations:**

- The URL is identical to that of the first book.
- The newly created book already displays **Unfavorite**.
- Returning to **Books** reveals only one Course Handbook entry.

**Expected Behavior:** Two independent book creation operations should create two distinct book objects, even if their field values are identical.

**Fault Evidence:** Two independent creation operations result in only one book object.

Note that this is neither a double-click on the Save button nor a network retry. The two operations involve opening separate creation forms, entering the values, and saving each book independently.

## 7. End the Demonstration

Return to the PowerShell terminal running the application and press Ctrl+C to stop it.
