(function (global) {
  "use strict";

  const folder = (id, name, children, options = {}) => Object.assign({ id, name, kind: "folder", type: "Folder", children }, options);
  const file = (id, name, type, metadata, preview, evidence) => ({
    id, name, kind: "file", type, metadata, preview, evidence
  });

  const training = {
    id: "training",
    number: "TRAINING FILE 000",
    title: "The Misplaced Screenshot",
    subtitle: "Avery took a screenshot a few minutes ago. Locate it and prove it is the right file.",
    objective: "Find Avery's new screenshot and provide evidence that its timestamp matches Avery's statement.",
    client: "Avery",
    locations: [
      folder("t-desktop", "Desktop", [
        file("avery-screenshot", "Screenshot 2026-09-11 at 1.42.18 PM.png", "PNG Image", { created: "Sep 11, 1:42 PM", modified: "Sep 11, 1:42 PM", size: "1.8 MB" }, { heading: "Image preview", lines: ["A coding project window", "Class clock visible: 1:42 PM", "Screenshot dimensions: 1440 × 900"] }, { title: "Screenshot timestamp", detail: "Desktop screenshot created and modified at 1:42 PM." }),
        file("t-homework", "Homework.pages", "Pages Document", { created: "Sep 8, 4:18 PM", modified: "Sep 10, 6:02 PM", size: "224 KB" }, { heading: "Document preview", lines: ["English homework", "Three paragraphs", "No embedded screenshots"] }),
        file("t-notes", "Notes.txt", "Text Document", { created: "Sep 9, 10:10 AM", modified: "Sep 11, 12:55 PM", size: "3 KB" }, { heading: "Text preview", lines: ["Remember to submit the project", "Ask about keyboard shortcut"] })
      ]),
      folder("t-documents", "Documents", [
        folder("t-school", "School", [
          folder("t-project", "Project", [
            file("old-screenshot", "old-screenshot.png", "PNG Image", { created: "Aug 22, 3:20 PM", modified: "Aug 22, 3:20 PM", size: "940 KB" }, { heading: "Image preview", lines: ["Old project planning board", "Date visible: August 22"] }, { title: "Old screenshot timestamp", detail: "Project screenshot created on August 22." })
          ])
        ])
      ]),
      folder("t-downloads", "Downloads", [
        file("funny-cat", "funny-cat.jpg", "JPEG Image", { created: "Sep 10, 8:03 PM", modified: "Sep 10, 8:03 PM", size: "612 KB" }, { heading: "Image preview", lines: ["A cat sitting on a router", "Caption: I fits, I transmits"] }),
        file("t-worksheet", "worksheet.pdf", "PDF Document", { created: "Sep 10, 1:14 PM", modified: "Sep 10, 1:14 PM", size: "182 KB" }, { heading: "PDF preview", lines: ["Digital citizenship worksheet", "Page 1 of 2"] })
      ])
    ],
    evidence: {
      "avery-statement": { title: "Avery's 1:42 PM statement", detail: "Avery says the screenshot was taken at about 1:42 PM.", source: "Interview" }
    },
    deductions: [{ id: "training-match", title: "Timestamp Match", detail: "Avery's time matches the Desktop screenshot metadata." }],
    connectionRules: [{ a: "avery-statement", verb: "SUPPORTS", b: "avery-screenshot", deduction: "training-match" }]
  };

  const case001 = {
    id: "case001",
    number: "CASE 001",
    title: "The Vanishing Assignment",
    subtitle: "Miles finished his volcano project. In the morning, his final edits appeared to be gone.",
    objective: "Determine what happened to Miles's completed assignment and locate the finished file.",
    client: "Miles",
    locations: [
      folder("desktop", "Desktop", [
        file("final-english", "final.pdf", "PDF Document", { created: "Sep 8, 5:02 PM", modified: "Sep 8, 5:02 PM", size: "488 KB" }, { heading: "PDF preview", lines: ["Macbeth Character Analysis", "English — Period 3", "The filename 'final' continues to solve nothing."] }, { title: "Unrelated final.pdf", detail: "An English assignment with an impressively unhelpful name." }),
        file("desktop-screenshot", "Screenshot 2026-09-10 at 8.14.22 PM.png", "PNG Image", { created: "Sep 10, 8:14 PM", modified: "Sep 10, 8:14 PM", size: "1.4 MB" }, { heading: "Image preview", lines: ["Volcano research in a web browser", "A download bar is visible", "The downloaded filename is not readable"] }, { title: "8:14 PM screenshot", detail: "A screenshot from the night Miles worked; a browser download bar is visible." }),
        folder("stuff", "Stuff", [
          file("schedule", "schedule.png", "PNG Image", { created: "Aug 27, 2:40 PM", modified: "Aug 27, 2:40 PM", size: "210 KB" }, { heading: "Image preview", lines: ["Weekly class schedule"] }),
          file("game-notes", "game-notes.txt", "Text Document", { created: "Sep 1, 7:10 PM", modified: "Sep 8, 8:19 PM", size: "6 KB" }, { heading: "Text preview", lines: ["Game ideas", "More lasers?", "Answer: probably."] }),
          file("final-final-pages", "VolcanoProject_FINAL_FINAL.pages", "Pages Document", { created: "Aug 27, 4:54 PM", modified: "Aug 29, 5:22 PM", size: "1.1 MB" }, { heading: "Document preview", completion: "Old draft", lines: ["Introduction: partial", "Causes: notes only", "Major volcanoes: blank", "Image: missing", "Conclusion: blank"] }, { title: "FINAL_FINAL old draft", detail: "An old Desktop draft last modified August 29." })
        ]),
        folder("school-old", "School OLD", [
          folder("old-english", "English", []),
          folder("old-science", "Science", [
            file("school-old-volcano", "VolcanoProject.pages", "Pages Document", { created: "Aug 25, 11:12 AM", modified: "Aug 26, 2:11 PM", size: "744 KB" }, { heading: "Document preview", completion: "Early outline", lines: ["Title page", "Research questions", "Several empty sections"] }, { title: "School OLD project", detail: "An early copy last modified August 26." })
          ])
        ])
      ]),
      folder("documents", "Documents", [
        folder("school", "School", [
          folder("english", "English", []),
          folder("math", "Math", []),
          folder("science", "Science", [
            folder("volcano-project-folder", "Volcano Project", [
              file("volcano-project", "VolcanoProject.pages", "Pages Document", { created: "Sep 3, 3:09 PM", modified: "Sep 7, 4:18 PM", size: "1.7 MB" }, { heading: "Document preview", completion: "Unfinished draft", lines: ["Introduction: complete", "Causes: partial", "Major volcanoes: incomplete", "Image: missing", "Conclusion: blank"] }, { title: "Old unfinished project", detail: "The oldest draft in the normal Science project folder, modified September 7." }),
              file("volcano-final", "VolcanoFinal.pages", "Pages Document", { created: "Sep 7, 4:22 PM", modified: "Sep 9, 6:31 PM", size: "2.4 MB" }, { heading: "Document preview", completion: "Mostly finished", lines: ["Introduction: complete", "Causes: complete", "Major volcanoes: complete", "Image: missing", "Conclusion: two unfinished sentences", "Sources: incomplete"] }, { title: "Science-folder working file", detail: "Mostly finished Pages document; last modified September 9 at 6:31 PM." }),
              file("volcano-project-pdf", "VolcanoProject.pdf", "PDF Document", { created: "Sep 9, 6:36 PM", modified: "Sep 9, 6:36 PM", size: "1.3 MB" }, { heading: "PDF preview", completion: "Incomplete export", lines: ["Content matches the incomplete Science-folder version", "Image: missing", "Conclusion: unfinished", "Sources: incomplete"] }, { title: "Incomplete PDF export", detail: "A September 9 PDF with the same incomplete content as VolcanoFinal.pages." })
            ])
          ])
        ])
      ]),
      folder("downloads", "Downloads", [
        file("really-final", "ReallyFinal.pages", "Pages Document", { created: "Sep 10, 7:14 PM", modified: "Sep 10, 9:47 PM", size: "3.8 MB" }, { heading: "Document preview", completion: "Complete", lines: ["Introduction: complete", "Causes: complete", "Major volcanoes: complete", "Volcano diagram: present", "Conclusion: complete", "Sources: complete"] }, { title: "ReallyFinal.pages", detail: "A completed Pages document in Downloads, modified September 10 at 9:47 PM." }),
        file("volcano-export", "VolcanoProject_FINAL.pdf", "PDF Document", { created: "Sep 10, 9:51 PM", modified: "Sep 10, 9:51 PM", size: "2.9 MB" }, { heading: "PDF preview", completion: "Complete export", lines: ["Content matches ReallyFinal.pages", "Volcano diagram: present", "Conclusion: complete", "Sources: complete"] }, { title: "Completed PDF export", detail: "A completed PDF in Downloads, created September 10 at 9:51 PM." }),
        file("volcano-notes", "volcano_notes.pdf", "PDF Document", { created: "Sep 4, 2:14 PM", modified: "Sep 4, 2:14 PM", size: "364 KB" }, { heading: "PDF preview", lines: ["Research notes", "Web links and quotations", "Not the assignment"] }),
        file("worksheet", "worksheet.pdf", "PDF Document", { created: "Sep 3, 1:06 PM", modified: "Sep 3, 1:06 PM", size: "198 KB" }, { heading: "PDF preview", lines: ["Plate tectonics worksheet"] }),
        file("img4822", "IMG_4822.jpg", "JPEG Image", { created: "Sep 6, 5:33 PM", modified: "Sep 6, 5:33 PM", size: "2.2 MB" }, { heading: "Image preview", lines: ["A dog wearing protective goggles"] }),
        file("meme", "meme.png", "PNG Image", { created: "Sep 10, 4:42 PM", modified: "Sep 10, 4:42 PM", size: "520 KB" }, { heading: "Image preview", lines: ["Distracted student meme", "No volcanoes were researched here"] }),
        file("volcano-diagram", "volcano_diagram.png", "PNG Image", { created: "Sep 10, 7:19 PM", modified: "Sep 10, 7:19 PM", size: "880 KB" }, { heading: "Image preview", lines: ["Labeled cross-section of a stratovolcano", "This diagram appears in the completed project"] }, { title: "Volcano diagram", detail: "An image downloaded minutes after ReallyFinal.pages was created." })
      ]),
      folder("trash", "Trash", [
        file("volcano-old-trash", "VolcanoProjectOLD.pages", "Pages Document", { created: "Aug 24, 12:10 PM", modified: "Aug 28, 3:06 PM", size: "690 KB" }, { heading: "Document preview", completion: "Discarded outline", lines: ["Title and outline only", "No final sections", "Last activity was in August"] }, { title: "Trash project", detail: "A discarded outline last modified August 28, long before the assignment vanished." }),
        file("old-math", "old-math-homework.pdf", "PDF Document", { created: "Aug 20, 9:31 AM", modified: "Aug 20, 9:31 AM", size: "116 KB" }, { heading: "PDF preview", lines: ["Linear equations practice"] }),
        file("old-screen", "Screenshot 2026-08-28 at 3.12.44 PM.png", "PNG Image", { created: "Aug 28, 3:12 PM", modified: "Aug 28, 3:12 PM", size: "932 KB" }, { heading: "Image preview", lines: ["An early volcano outline"] })
      ])
    ],
    evidence: {
      "miles-assignment": { title: "Missing final edits", detail: "Miles says the file in his Science folder is missing the edits he finished.", source: "Interview" },
      "miles-10pm": { title: "Miles worked until about 10 PM", detail: "Miles says he finished September 10 at roughly 10 PM.", source: "Interview" },
      "miles-pdf": { title: "Miles exported a PDF", detail: "Miles says he exported a PDF after he finished editing.", source: "Interview" },
      "miles-normal-folder": { title: "Miles's normal Science folder", detail: "Miles normally saves work in Documents / School / Science / Volcano Project.", source: "Interview" },
      "miles-downloaded-copy": { title: "Miles opened a downloaded copy", detail: "Miles remembers downloading another copy, opening it, and continuing his work there.", source: "Interview" }
    },
    leads: [
      { id: "find-work", title: "Find Last Night's Copy", detail: "Miles says he worked until about 10 PM, but the Science-folder file was last modified the previous day. Find another project file modified on September 10." },
      { id: "completed-version", title: "Check the Completed Version", detail: "A project file in Downloads appears more complete than the version in the Science folder. Inspect and compare them." },
      { id: "why-downloads", title: "Why Downloads?", detail: "The completed work exists in Downloads instead of Miles's normal Science folder. Determine how that happened." },
      { id: "confirm-export", title: "Confirm the Export", detail: "Miles remembers exporting a PDF after finishing. Find a PDF whose timestamp and contents match the completed project." },
      { id: "reconstruct", title: "Reconstruct the Night", detail: "You have enough evidence to determine which file Miles edited and why he could not find it the next morning." }
    ],
    progressGoals: [
      { id: "statement-time", text: "Establish when Miles says he worked" },
      { id: "expected-version", text: "Inspect the expected Science-folder version" },
      { id: "matching-project", text: "Find a project file matching Miles's timeline" },
      { id: "outside-folder", text: "Determine why the completed version is outside his normal folder" },
      { id: "reconstruct", text: "Reconstruct what happened" }
    ],
    deductions: [
      { id: "timeline-match", title: "Timeline Match", detail: "`ReallyFinal.pages` was modified at 9:47 PM, matching the time Miles says he was finishing the project." },
      { id: "wrong-working-file", title: "Wrong Working File", detail: "`VolcanoFinal.pages` was not modified on the night Miles says he finished the assignment. His last-night work must be in another file." },
      { id: "duplicate-copy", title: "Duplicate Copy", detail: "Miles remembers opening a downloaded copy, and the completed file is stored in Downloads. He continued working on that copy rather than the file in his Science folder." },
      { id: "export-confirmed", title: "Export Confirmed", detail: "The completed PDF was created four minutes after `ReallyFinal.pages` was saved, supporting Miles's memory that he exported the project after finishing." }
    ],
    connectionRules: [
      { a: "miles-10pm", verb: "SUPPORTS", b: "really-final", deduction: "timeline-match" },
      { a: "volcano-final", verb: "CONTRADICTS", b: "miles-10pm", deduction: "wrong-working-file" },
      { a: "really-final", verb: "RELATED TO", b: "miles-downloaded-copy", deduction: "duplicate-copy" },
      { a: "really-final", verb: "OCCURRED BEFORE", b: "volcano-export", deduction: "export-confirmed" }
    ],
    finalTheory: {
      questions: [
        {
          id: "what", legend: "What happened?", correct: "unexpected", options: [
            { id: "unexpected", label: "The completed assignment was saved somewhere Miles wasn't expecting." },
            { id: "deleted", label: "The completed assignment was deleted." },
            { id: "unsaved", label: "The completed work was never saved." },
            { id: "moved", label: "The computer automatically moved the assignment." }
          ]
        },
        {
          id: "why", legend: "Why?", correct: "duplicate", options: [
            { id: "duplicate", label: "Miles continued editing a duplicate downloaded copy rather than the file in his normal Science folder." },
            { id: "malware", label: "Malware changed his assignment." },
            { id: "trash", label: "Miles accidentally deleted his current working file." },
            { id: "sync", label: "Cloud sync replaced the new version with an old version." }
          ]
        }
      ],
      supportEvidence: ["really-final", "volcano-final", "volcano-export", "miles-10pm", "miles-downloaded-copy", "miles-pdf"]
    },
    reconstruction: [
      { id: "opened", text: "Miles opens a downloaded copy of the project." },
      { id: "edited", text: "Miles continues editing that copy." },
      { id: "saved", text: "ReallyFinal.pages is saved in Downloads." },
      { id: "exported", text: "Miles exports VolcanoProject_FINAL.pdf." },
      { id: "checked", text: "The next morning, Miles checks only his normal Science folder." }
    ],
    hints: [
      "Start with Miles's story. He says he worked on the project the night of September 10 and finished around 10 PM. Check the modification dates of the project files in his Science folder.",
      "`VolcanoFinal.pages` does not match Miles's timeline. It was last modified on September 9. If Miles really worked the next night, another copy must exist somewhere.",
      "Search outside the Science folder. Check Desktop, Downloads, and Trash for other volcano-project files. Pay special attention to files modified on September 10.",
      "Inspect `ReallyFinal.pages` in Downloads. Compare its contents and modification time with `VolcanoFinal.pages`.",
      "Compare the timeline. Miles says he finished around 10 PM. `ReallyFinal.pages` was modified at 9:47 PM, and the completed PDF was created at 9:51 PM.",
      "Return to Miles with what you found. Ask him about `ReallyFinal.pages` and how a finished copy could have ended up in Downloads."
    ]
  };

  global.TechDetectiveCases = Object.freeze({ training, case001 });
}(window));
