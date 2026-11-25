# BookStack: Black-Box and White-Box Testing Demo Guide for TAs (Version 2)

## 1. Start BookStack

Open PowerShell at the repository root and run:

```powershell
cd applications\bookstack
npm.cmd ci --include=dev --include=optional
.\start.bat --port auto
```

Dependency installation may take a few minutes. Open the **exact URL printed in the terminal**. The port may not be `3000`. Keep the PowerShell window open throughout the demonstration.

## 2. Log In and Prepare Ten Books

Use a fresh application instance with no existing viewing or favorite history for the supplied account. Stay logged in for all subsequent steps.

1. Click **Login** in the upper-right corner.
2. Enter Email `bookstack_user@example.com` and Password `Password123!`.
3. Leave **Remember Me** at its default and click **Login** on the form.
4. Choose a unique suffix for this run, such as `1125-01`.
5. Go to **Books → Create New Book**, enter the values below, and click **Save Book**. Repeat with a different name until all ten books have been created:

   | Field | Value |
   |---|---|
   | Name | `Initial-01-1125-01` through `Initial-10-1125-01` |
   | Description | `Initial viewing record` |
   | Tags | `testing` |

6. Each save opens the new book's details and records a visit. After the tenth save, click **BookStack Demo** to return home.
7. Refresh if needed. Confirm that **My Recently Viewed** contains ten entries.

Do not favorite any books yet. The local database is excluded from Git; prepare these records again after a fresh clone.

## 3. Black-Box Test: Create Books with Different Descriptions

Observe the application through its interface. **Do not inspect the implementation yet.**

REQ-5.3 in `applications/bookstack/requirements/requirements.yaml` states:

> Description supports rich text, a cover is optional, and a default page template can be chosen.

Test four description categories. Use your run suffix and set Tags to `testing` for each book.

| Category | Book name | Description or action |
|---|---|---|
| A: Single-line text | `Description-A-1125-01` | `Testing handbook` |
| B: Multiline text | `Description-B-1125-01` | Enter `Testing objectives` on the first line and `Testing methods` on the second. |
| C: Special characters | `Description-C-1125-01` | `Testing café résumé 📚 & < > " '` |
| D: Rich text | `Description-D-1125-01` | Enter `Testing handbook` and look for a way to apply text formatting. |

For A, B, and C:

1. Click **Books → Create New Book**.
2. Enter the corresponding name, description, and tags.
3. Click **Save Book** and compare the displayed description with the input: A should retain the exact text, B should retain two separate lines, and C should retain every character literally.
4. Reload, click **Edit**, and check that the content is retained.
5. Click **Cancel** before creating the next book.

For D:

1. Open a new creation form and enter the name, description, and tags.
2. Select `Testing` in Description. Inspect the field and surrounding form for formatting controls, menus, or instructions for entering formatted text.
3. If a formatting method is available, apply a supported format, save, reload, and check that it is retained. In the supplied implementation, the form offers only a plain multiline textbox, so this operation cannot be completed. Capture the full form as evidence.
4. Enter `Testing handbook` as plain text and click **Save Book** so that all four books exist for the next test.

**Expected behavior:** Description supports rich text and preserves supported formatting after saving and reload.

**Fault evidence:** The creation form provides only plain-text input and cannot perform the rich-text operation required by REQ-5.3.

The requirement does not prescribe a particular formatting button or HTML input syntax. Displaying typed HTML tags literally is not sufficient evidence on its own.

## 4. Prepare for the White-Box Test

You now have ten initial books and four description test books. Stay logged in and do not favorite anything yet.

Open this file in your editor:

```text
applications/bookstack/backend/src/slices/bookstack.ts
```

Find `/api/home` and inspect these five blocks. The supplied version prints a terminal log after each block.

| Block | Lines | Operation | Output |
|---|---|---|---|
| 1 | 186–198 | Collect viewing records | `allViewed` |
| 2 | 199–203 | Sort and select at most ten records | `recentlyViewed` |
| 3 | 205–216 | Collect favorites | `favorites` |
| 4 | 217–222 | Select at most four favorites and build their identity set | `favoriteTop`, `favoriteKeys` |
| 5 | 223–229 | Filter recently viewed records | `recentWithoutFavoriteDuplicates`, diagnostic `removedItems` |

Use variable names and log numbers if line numbers change. Read the filtering statement:

```typescript
const recentWithoutFavoriteDuplicates = recentlyViewed.filter(
  (item) => !favoriteKeys.has(`${item.type}:${item.id}`)
);
```

The response returns this filtered list as `recentlyViewed`.

Reading code now does not change the black-box nature of the previous test. The next test uses the code to select inputs before execution.

## 5. Check the Limit and Identify the Coverage Gap

1. Click **Books** and open `Initial-01-1125-01`, using your actual suffix.
2. Click **BookStack Demo**, then press **F5**.
3. Count the book entries inside **My Recently Viewed**. With fourteen visited books and no favorites, the supplied implementation should display ten.
4. Repeat with `Initial-02-1125-01` and `Description-D-1125-01`. Check the ten-item count each time.
5. Switch to the PowerShell window running the application. For the latest homepage request, inspect the consecutive logs `[BookStack white-box][1]` through `[5]`. In log `[2]`, check the selected list; in log `[5]`, check the counts and `removedItems`.

With no favorites, log `[5]` should show:

```text
beforeCount: 10
afterCount: 10
removedItems: []
```

This capacity check can pass repeatedly without exercising removal of a favorited item. An incorrect deletion would still satisfy an assertion that the list contains **at most ten** entries. The requirements do not specify an eviction order or a tie-breaker for equal viewing times.

The existing `REQ-7.1.spec.ts` tests visit a shelf and check that it appears in recently viewed items. They do not favorite that shelf. `REQ-8.1.spec.ts` and `REQ-8.2.spec.ts` test favorite behavior but do not check whether the favorited book remains in recently viewed items.

The capacity check above illustrates the gap; it is not an actual existing standard test. The missing assertion concerns **My Recently Viewed when `removedItems` is nonempty**. Favorite tests may execute that condition without checking its effect on this region.

## 6. Your Task: Design the White-Box Test

**Do not click Favorite yet.** Use the code to choose inputs for both filter outcomes:

| State | Target in `recentlyViewed`? | Target in `favoriteKeys`? | Code prediction |
|---|---|---|---|
| Not favorited | Yes | No | Keep the target |
| Favorited and shown in homepage favorites | Yes | Yes | Remove the target |

Use **Description-A** as the target; its full name is `Description-A-1125-01` with your actual suffix. Keep the favorites collection empty until Section 7. Confirm that the target appears in log `[2]` before testing the filter. This separates filtering from the ten-item limit.

Write down your expectation:

> **Expected behavior:** A book present in recently viewed items should remain there when favorited. It may also appear in My Most Viewed Favorites.

REQ-7.1 requires visits to be recorded and reopened; REQ-8.2 describes homepage favorites. They do not require the two regions to be mutually exclusive.

## 7. Execute the White-Box Test: Favorite the Viewed Book

1. Open **Description-A** from **Books** and save its full URL.
2. Return home and confirm that it appears in **My Recently Viewed**. Check log `[2]` if necessary.
   Do not continue unless this baseline holds. Reopen the saved URL, return home, and refresh to check again; if it still fails, record that result separately rather than attributing it to the favorite filter.
3. Perform the following steps:

   | Step | Action | What to observe |
   |---|---|---|
   | 1 | Open the target and click **Favorite**. | The button changes to **Unfavorite**. |
   | 2 | Return home and refresh if needed. | The target appears in **My Most Viewed Favorites** but disappears from **My Recently Viewed**. |
   | 3 | Inspect logs `[1]` through `[5]` in PowerShell. | The target survives viewing-record selection, enters the favorite set, and is then listed in `removedItems`. |
   | 4 | Open the target from favorites, verify its URL, and click **Unfavorite**. | The button changes back to **Favorite**. |
   | 5 | Return home and refresh if needed. | The target reappears in **My Recently Viewed**; `removedItems` returns to `[]`. |

When the target is favorited, log `[5]` should contain values similar to these:

```text
beforeCount: 10
afterCount: 9
recentWithoutFavoriteDuplicates: [the nine retained records]
removedItems: [{ type: "book", id: ..., name: "Description-A-1125-01", ... }]
```

This is an abbreviated example; actual IDs and fields vary. `removedItems` is a terminal diagnostic, not a new response field.

**Fault evidence:** The target's entry count in **My Recently Viewed** changes **1 → 0 → 1** as it is favorited and unfavorited. Log `[5]` identifies the record removed by the filter.

Compare the result with your written expectation. Blocks 1 and 2 retain the viewing record; the incorrect removal occurs in Block 5.

Discuss these questions:

- Why does checking only the ten-item limit miss this fault?
- What input makes `removedItems` nonempty?
- Why should appearing in favorites not remove a recently viewed entry?

This test examines the five related processing blocks and both keep/remove outcomes of the filter. It does not claim full path coverage of `/api/home`.

## 8. End the Demonstration

Save your observations and screenshots. Return to the PowerShell window running BookStack and press **Ctrl+C** to stop the application.
