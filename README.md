# 🔍 DuFind

**Ultra-fast file search for Windows.**
Minimal, local, private and ridiculously fast.

---

## ⚡ About

**DuFind** is an open-source file search tool designed to be **faster than the Windows search**, focusing on:

* ⚡ Instant results
* 🧠 Smart indexing
* 🔄 Real-time monitoring
* 💻 Minimal and clean interface
* 🔒 100% local (no cloud, no tracking)

It was built with one goal:

> **Find anything on your PC in milliseconds.**

---

## 🚀 Features

### 🔎 Search

* Search by **file name**
* Ultra-fast results (memory + indexed database)
* Keyboard navigation (Everything-style)

### 📁 File Actions

* Open file
* Open containing folder
* Reveal in Explorer
* Copy full path

### 🧠 Indexing Engine

* Local file indexing
* Persistent database
* Incremental updates

### 🔄 Real-time Watcher

* Detects:

  * new files
  * changes
  * deletions
* Keeps index always up to date

### ⭐ Favorites

* Mark files as favorites
* Filter only favorites

### 🧩 Filters

* Filter by file extension
* Combine with search

### 📄 Content Search

* Search inside files (configurable extensions)

### ⚙️ System Integration

* Start with Windows
* Global shortcut to open search

---

## 🧱 Tech Stack

* **Electron** (desktop runtime)
* **Node.js**
* **Vanilla JS (no frameworks)**
* **SQLite (local database)**
* **Chokidar (file watcher)**

---

## 📂 Project Structure

```
dufind/
│
├── src/
│   ├── main.js
│   ├── preload.js
│   ├── ipc.js
│   ├── engine.js
│   ├── indexer.js
│   ├── watcher.js
│   ├── search.js
│   ├── db.js
│   ├── actions.js
│   ├── favorites.js
│   ├── content.js
│   ├── config.js
│   └── startup.js
│
├── ui/
│   ├── index.html
│   ├── style.css
│   └── app.js
│
├── assets/
│   └── icon.ico
│
├── package.json
└── README.md
```

---

## 🛠 Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-username/dufind.git
cd dufind
```

### 2. Install dependencies

```bash
npm install
```

### ⚠️ Important (Windows)

If you get errors with native modules (like SQLite):

* Install **Python 3**
* Install **Visual Studio Build Tools**

Then run:

```bash
npm install --build-from-source
```

---

## ▶️ Running

```bash
npm start
```

---

## 📦 Build (Windows)

```bash
npm run dist
```

The executable will be generated in:

```
/release
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut   | Action                 |
| ---------- | ---------------------- |
| `Ctrl + F` | Focus search           |
| `Enter`    | Open selected file     |
| `↑ ↓`      | Navigate results       |
| `Ctrl + C` | Copy path              |
| `Ctrl + D` | Open containing folder |
| `Ctrl + R` | Reindex                |
| `Esc`      | Clear search           |

---

## ⚙️ Configuration

Settings are stored locally and include:

* Indexed paths
* Ignored folders/extensions
* Content search extensions
* Max results
* Startup behavior
* Global shortcut

---

## 🔒 Privacy

DuFind is **100% local**:

* ❌ No internet required
* ❌ No telemetry
* ❌ No data collection
* ✅ Your files never leave your machine

---

## 🧪 Performance Philosophy

DuFind is designed around:

* In-memory indexing
* Minimal disk access during search
* Smart caching
* Incremental updates

> Search should feel **instant**, not "loading".

---

## 🤝 Contributing

Contributions are welcome!

### Ideas:

* Better ranking algorithm
* Fuzzy search
* File preview improvements
* UI enhancements
* Performance optimizations

### Steps:

```bash
fork → clone → branch → commit → pull request
```

---

## 🐛 Issues

Found a bug?
Open an issue and describe:

* What happened
* Expected behavior
* Steps to reproduce

---

## 📜 License

MIT License

---

## 💡 Inspiration

DuFind is inspired by tools like:

* Everything
* Spotlight
* Raycast

But with a focus on:

> **Open source + simplicity + speed**

---

## 👨‍💻 Author

Developed by **Jair Cleiton Silva**

---

## ⭐ Support

If you like this project:

* ⭐ Star the repo
* 🗣 Share it
* 💡 Contribute

---

## 🔥 Final Note

This is not just another search tool.

> This is what Windows search should have been.
