/* Weekly Planner — all state lives in localStorage, no server, no build step. */
(() => {
  "use strict";

  const STORAGE_KEY = "weekly-planner-v1";

  const DAYS = [
    { id: "mon", label: "Monday", weekday: 1 },
    { id: "tue", label: "Tuesday", weekday: 2 },
    { id: "wed", label: "Wednesday", weekday: 3 },
    { id: "thu", label: "Thursday", weekday: 4 },
    { id: "fri", label: "Friday", weekday: 5 },
    { id: "sat", label: "Saturday", weekday: 6 },
    { id: "sun", label: "Sunday", weekday: 0 }
  ];

  const ICONS = {
    chevron: "M9 6l6 6-6 6",
    pencil: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z",
    trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M9 7V4h6v3"
  };

  const STARTER = {
    projects: [
      { id: "p1", title: "Work" },
      { id: "p2", title: "Home" },
      { id: "p3", title: "Health" },
      { id: "p4", title: "Learning" },
      { id: "p5", title: "Personal" }
    ],
    tasks: [
      { id: "t1", projectId: "p1", title: "Write the week's top three outcomes", day: "mon", completed: false },
      { id: "t2", projectId: "p1", title: "Draft the project update", day: "wed", completed: false },
      { id: "t3", projectId: "p1", title: "Send the weekly report", day: "fri", completed: false },
      { id: "t4", projectId: "p2", title: "Groceries and meal plan", day: "sat", completed: false },
      { id: "t5", projectId: "p2", title: "Pay the bills", day: "tue", completed: false },
      { id: "t6", projectId: "p3", title: "Three walks this week", day: "", completed: false },
      { id: "t7", projectId: "p4", title: "Finish the current module", day: "thu", completed: false },
      { id: "t8", projectId: "p5", title: "Plan the weekend", day: "", completed: false }
    ]
  };

  const root = document.querySelector(".page");
  const live = root.querySelector("[data-live]");

  /* ---------- state ---------- */

  const uid = prefix =>
    prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const clone = value => JSON.parse(JSON.stringify(value));

  const sanitize = raw => {
    if (!raw || typeof raw !== "object") return null;
    const projects = Array.isArray(raw.projects) ? raw.projects : null;
    const tasks = Array.isArray(raw.tasks) ? raw.tasks : null;
    if (!projects || !tasks) return null;
    const cleanProjects = projects
      .filter(p => p && typeof p.id === "string")
      .map(p => ({ id: p.id, title: String(p.title || "Untitled project") }));
    const ids = new Set(cleanProjects.map(p => p.id));
    const cleanTasks = tasks
      .filter(t => t && typeof t.id === "string" && ids.has(t.projectId))
      .map(t => ({
        id: t.id,
        projectId: t.projectId,
        title: String(t.title || "").trim() || "Untitled task",
        day: DAYS.some(d => d.id === t.day) ? t.day : "",
        completed: Boolean(t.completed)
      }));
    return { projects: cleanProjects, tasks: cleanTasks };
  };

  const load = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = sanitize(JSON.parse(stored));
        if (parsed) return parsed;
      }
    } catch (error) {
      announce("The saved planner could not be read, so a fresh one was loaded.");
    }
    return clone(STARTER);
  };

  let state = load();
  let editingTaskId = null;
  let renamingProjectId = null;
  let openProjects = new Set(state.projects.slice(0, 1).map(p => p.id));

  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      announce("Changes work here but could not be saved in this browser.");
    }
  };

  function announce(message) {
    live.textContent = message;
  }

  /* ---------- small DOM helpers ---------- */

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };

  const icon = (path, extraClass) => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("class", "icon" + (extraClass ? " " + extraClass : ""));
    const d = document.createElementNS("http://www.w3.org/2000/svg", "path");
    d.setAttribute("d", path);
    svg.appendChild(d);
    return svg;
  };

  const iconButton = (pathData, label, className) => {
    const button = el("button", "btn btn-icon btn-ghost" + (className ? " " + className : ""));
    button.type = "button";
    button.title = label;
    button.setAttribute("aria-label", label);
    button.appendChild(icon(pathData, "icon-sm"));
    return button;
  };

  const dayLabel = dayId => {
    const day = DAYS.find(item => item.id === dayId);
    return day ? day.label : "Unscheduled";
  };

  const projectOf = task => state.projects.find(p => p.id === task.projectId);

  const colorIndex = projectId => {
    const position = state.projects.findIndex(p => p.id === projectId);
    return ((position < 0 ? 0 : position) % 6) + 1;
  };

  const todayDayId = () => {
    const weekday = new Date().getDay();
    const match = DAYS.find(day => day.weekday === weekday);
    return match ? match.id : "";
  };

  /* ---------- mutations ---------- */

  const setCompleted = (taskId, completed) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    task.completed = completed;
    save();
    render();
    announce(task.title + (completed ? " completed." : " moved back to open."));
  };

  const assignDay = (taskId, dayId) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task || task.day === dayId) return;
    task.day = dayId;
    save();
    render();
    announce(task.title + " moved to " + dayLabel(dayId) + ".");
  };

  const deleteTask = taskId => {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    if (!window.confirm('Delete "' + task.title + '"?')) return;
    state.tasks = state.tasks.filter(t => t.id !== taskId);
    if (editingTaskId === taskId) editingTaskId = null;
    save();
    render();
    announce("Task deleted.");
  };

  /* ---------- task rows ---------- */

  const createCheckbox = task => {
    const input = el("input", "form-check-input");
    input.type = "checkbox";
    input.checked = task.completed;
    input.setAttribute("aria-label", (task.completed ? "Mark incomplete: " : "Complete: ") + task.title);
    input.addEventListener("change", () => setCompleted(task.id, input.checked));
    return input;
  };

  const makeDraggable = (element, taskId) => {
    element.draggable = true;
    element.addEventListener("dragstart", event => {
      event.dataTransfer.setData("text/plain", taskId);
      event.dataTransfer.effectAllowed = "move";
      element.classList.add("is-dragging");
    });
    element.addEventListener("dragend", () => element.classList.remove("is-dragging"));
  };

  const createEditForm = task => {
    const form = el("form", "edit-form");

    const title = el("input", "form-control");
    title.value = task.title;
    title.required = true;
    title.setAttribute("aria-label", "Task title");

    const projectSelect = el("select", "form-select");
    projectSelect.setAttribute("aria-label", "Project");
    state.projects.forEach(project => {
      const option = el("option", null, project.title);
      option.value = project.id;
      option.selected = project.id === task.projectId;
      projectSelect.appendChild(option);
    });

    const daySelect = el("select", "form-select");
    daySelect.setAttribute("aria-label", "Day");
    const none = el("option", null, "Unscheduled");
    none.value = "";
    none.selected = !task.day;
    daySelect.appendChild(none);
    DAYS.forEach(day => {
      const option = el("option", null, day.label);
      option.value = day.id;
      option.selected = day.id === task.day;
      daySelect.appendChild(option);
    });

    const actions = el("div", "field-actions");
    const submit = el("button", "btn btn-primary", "Save");
    submit.type = "submit";
    const cancel = el("button", "btn btn-ghost", "Cancel");
    cancel.type = "button";
    cancel.addEventListener("click", () => {
      editingTaskId = null;
      render();
    });
    actions.append(submit, cancel);

    form.append(title, projectSelect, daySelect, actions);
    form.addEventListener("submit", event => {
      event.preventDefault();
      const value = title.value.trim();
      if (!value) return;
      task.title = value;
      task.projectId = projectSelect.value;
      task.day = daySelect.value;
      editingTaskId = null;
      save();
      render();
      announce("Task updated.");
    });

    window.requestAnimationFrame(() => title.focus());
    return form;
  };

  const createTaskActions = task => {
    const actions = el("div", "task-actions");
    const edit = iconButton(ICONS.pencil, "Edit " + task.title);
    edit.addEventListener("click", () => {
      editingTaskId = task.id;
      render();
    });
    const remove = iconButton(ICONS.trash, "Delete " + task.title, "is-danger");
    remove.addEventListener("click", () => deleteTask(task.id));
    actions.append(edit, remove);
    return actions;
  };

  const createProjectTask = task => {
    const row = el("div", "task-row project-task");
    if (editingTaskId === task.id) {
      row.appendChild(createEditForm(task));
      return row;
    }
    makeDraggable(row, task.id);
    const label = el("span", "task-label" + (task.completed ? " is-complete" : ""), task.title);
    row.append(createCheckbox(task), label);
    if (task.day) row.appendChild(el("span", "badge badge-day", dayLabel(task.day)));
    row.appendChild(createTaskActions(task));
    return row;
  };

  const createDayTask = task => {
    const card = el("article", "day-task");
    if (editingTaskId === task.id) {
      card.appendChild(createEditForm(task));
      return card;
    }
    makeDraggable(card, task.id);
    const row = el("div", "task-row");
    const label = el("span", "task-label", task.title);
    row.append(createCheckbox(task), label);
    card.appendChild(row);

    const foot = el("div", "day-task-foot");
    const project = projectOf(task);
    if (project) {
      const meta = el("div", "day-task-project");
      const dot = el("span", "project-dot");
      dot.style.background = "var(--project-" + colorIndex(project.id) + ")";
      meta.append(dot, el("span", null, project.title));
      foot.appendChild(meta);
    } else {
      foot.appendChild(el("span"));
    }
    foot.appendChild(createTaskActions(task));
    card.appendChild(foot);
    return card;
  };

  const createDoneTask = task => {
    const row = el("div", "done-task");
    if (editingTaskId === task.id) {
      row.appendChild(createEditForm(task));
      return row;
    }
    const label = el("span", "task-label is-complete", task.title);
    row.append(createCheckbox(task), label, createTaskActions(task));
    return row;
  };

  /* ---------- projects ---------- */

  const renameProject = project => {
    const wrap = el("form", "project-rename");
    const input = el("input", "form-control");
    input.value = project.title;
    input.required = true;
    input.setAttribute("aria-label", "Project name");
    const save_ = el("button", "btn btn-primary", "Save");
    save_.type = "submit";
    const cancel = el("button", "btn btn-ghost", "Cancel");
    cancel.type = "button";
    cancel.addEventListener("click", () => {
      renamingProjectId = null;
      render();
    });
    wrap.append(input, save_, cancel);
    wrap.addEventListener("submit", event => {
      event.preventDefault();
      const value = input.value.trim();
      if (!value) return;
      project.title = value;
      renamingProjectId = null;
      save();
      render();
      announce("Project renamed.");
    });
    window.requestAnimationFrame(() => input.select());
    return wrap;
  };

  const deleteProject = project => {
    const count = state.tasks.filter(t => t.projectId === project.id).length;
    const message = count
      ? 'Delete "' + project.title + '" and its ' + count + " task" + (count === 1 ? "" : "s") + "?"
      : 'Delete "' + project.title + '"?';
    if (!window.confirm(message)) return;
    state.projects = state.projects.filter(p => p.id !== project.id);
    state.tasks = state.tasks.filter(t => t.projectId !== project.id);
    openProjects.delete(project.id);
    save();
    render();
    announce("Project deleted.");
  };

  const renderProjects = () => {
    const container = root.querySelector("[data-projects]");
    container.replaceChildren();

    if (!state.projects.length) {
      container.appendChild(
        el("div", "empty-slot", "No projects yet. Use “New project” to add one.")
      );
      return;
    }

    state.projects.forEach(project => {
      const tasks = state.tasks.filter(t => t.projectId === project.id);
      const done = tasks.filter(t => t.completed).length;
      const percent = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
      const isOpen = openProjects.has(project.id);

      const card = el("section", "project" + (isOpen ? " is-open" : ""));
      card.dataset.color = String(colorIndex(project.id));

      const header = el("div", "project-header");
      if (renamingProjectId === project.id) {
        header.appendChild(renameProject(project));
      } else {
        const toggle = el("button", "project-toggle");
        toggle.type = "button";
        toggle.setAttribute("aria-expanded", String(isOpen));
        toggle.append(
          icon(ICONS.chevron, "icon-sm project-chevron"),
          el("span", "project-dot"),
          el("span", "project-title", project.title),
          el("span", "project-count", done + " / " + tasks.length)
        );
        toggle.addEventListener("click", () => {
          if (openProjects.has(project.id)) openProjects.delete(project.id);
          else openProjects.add(project.id);
          render();
        });

        const actions = el("div", "project-actions");
        const rename = iconButton(ICONS.pencil, "Rename " + project.title);
        rename.addEventListener("click", () => {
          renamingProjectId = project.id;
          render();
        });
        const remove = iconButton(ICONS.trash, "Delete " + project.title, "is-danger");
        remove.addEventListener("click", () => deleteProject(project));
        actions.append(rename, remove);
        header.append(toggle, actions);
      }
      card.appendChild(header);

      if (isOpen) {
        const body = el("div", "project-body");
        const line = el("div", "project-progress-line text-small");
        line.append(
          el("span", null, "Progress"),
          el("span", "text-muted", percent + "%")
        );
        const track = el("div", "project-progress");
        track.setAttribute("role", "progressbar");
        track.setAttribute("aria-label", project.title + " progress");
        track.setAttribute("aria-valuemin", "0");
        track.setAttribute("aria-valuemax", "100");
        track.setAttribute("aria-valuenow", String(percent));
        const fill = el("span");
        fill.style.width = percent + "%";
        track.appendChild(fill);
        body.append(line, track);

        const list = el("div", "project-task-list");
        if (tasks.length) {
          tasks.forEach(task => list.appendChild(createProjectTask(task)));
        } else {
          list.appendChild(el("div", "empty-slot", "No tasks in this project yet."));
        }
        body.appendChild(list);
        card.appendChild(body);
      }

      container.appendChild(card);
    });
  };

  const wireDropzone = (dropzone, dayId) => {
    dropzone.addEventListener("dragover", event => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      dropzone.classList.add("is-over");
    });
    dropzone.addEventListener("dragleave", event => {
      if (!dropzone.contains(event.relatedTarget)) dropzone.classList.remove("is-over");
    });
    dropzone.addEventListener("drop", event => {
      event.preventDefault();
      dropzone.classList.remove("is-over");
      const taskId = event.dataTransfer.getData("text/plain");
      if (taskId) assignDay(taskId, dayId);
    });
  };

  const renderBacklog = () => {
    const zone = root.querySelector("[data-backlog]");
    const backlog = state.tasks.filter(t => !t.day && !t.completed);
    zone.replaceChildren();
    root.querySelector("[data-backlog-count]").textContent = String(backlog.length);
    if (backlog.length) {
      backlog.forEach(task => zone.appendChild(createDayTask(task)));
    } else {
      zone.appendChild(el("div", "empty-slot", "Drop a task here to take it off the calendar"));
    }
  };

  const renderDays = () => {
    const container = root.querySelector("[data-days]");
    container.replaceChildren();
    const today = todayDayId();

    DAYS.forEach(day => {
      const dayTasks = state.tasks.filter(t => t.day === day.id && !t.completed);
      const column = el("section", "day-column" + (day.id === today ? " is-today" : ""));

      const heading = el("div", "day-heading");
      const name = el("div", "day-name");
      name.appendChild(el("h3", null, day.label));
      if (day.id === today) name.appendChild(el("span", "day-today-tag", "Today"));
      heading.append(name, el("span", "badge", String(dayTasks.length)));

      const dropzone = el("div", "day-dropzone");
      dropzone.dataset.day = day.id;
      if (dayTasks.length) {
        dayTasks.forEach(task => dropzone.appendChild(createDayTask(task)));
      } else {
        dropzone.appendChild(el("div", "empty-slot", "Drop a task here"));
      }

      wireDropzone(dropzone, day.id);
      column.append(heading, dropzone);
      container.appendChild(column);
    });
  };

  const renderDone = () => {
    const container = root.querySelector("[data-done]");
    const doneTasks = state.tasks.filter(t => t.completed);
    container.replaceChildren();
    root.querySelector("[data-done-count]").textContent = String(doneTasks.length);
    if (doneTasks.length) {
      doneTasks.forEach(task => container.appendChild(createDoneTask(task)));
    } else {
      container.appendChild(el("div", "empty-slot", "Completed tasks land here."));
    }
  };

  const renderOverview = () => {
    const total = state.tasks.length;
    const done = state.tasks.filter(t => t.completed).length;
    const open = total - done;
    const scheduled = state.tasks.filter(t => !t.completed && t.day).length;
    const percent = total ? Math.round((done / total) * 100) : 0;

    root.querySelector("[data-overall-count]").textContent = done + " of " + total + " done";
    root.querySelector("[data-overall-progress]").style.width = percent + "%";
    root.querySelector(".progress-track").setAttribute("aria-valuenow", String(percent));
    root.querySelector("[data-stat-open]").textContent = String(open);
    root.querySelector("[data-stat-scheduled]").textContent = String(scheduled);
    root.querySelector("[data-stat-unscheduled]").textContent = String(open - scheduled);
    root.querySelector("[data-stat-done]").textContent = String(done);
  };

  const fillTaskFormSelects = () => {
    const projectSelect = root.querySelector("#new-task-project");
    const previous = projectSelect.value;
    projectSelect.replaceChildren();
    state.projects.forEach(project => {
      const option = el("option", null, project.title);
      option.value = project.id;
      projectSelect.appendChild(option);
    });
    if (previous && state.projects.some(p => p.id === previous)) projectSelect.value = previous;
  };

  const render = () => {
    renderProjects();
    renderDays();
    renderBacklog();
    renderDone();
    renderOverview();
    fillTaskFormSelects();
  };

  wireDropzone(root.querySelector("[data-backlog]"), "");

  /* ---------- header wiring ---------- */

  const taskForm = root.querySelector("[data-task-form]");
  const daySelect = root.querySelector("#new-task-day");
  const noDay = el("option", null, "Unscheduled");
  noDay.value = "";
  daySelect.appendChild(noDay);
  DAYS.forEach(day => {
    const option = el("option", null, day.label);
    option.value = day.id;
    daySelect.appendChild(option);
  });
  daySelect.value = todayDayId();

  root.querySelector("[data-open-task-form]").addEventListener("click", () => {
    if (!state.projects.length) {
      announce("Add a project first.");
      window.alert("Add a project first, then you can add tasks to it.");
      return;
    }
    taskForm.hidden = false;
    root.querySelector("#new-task-title").focus();
  });

  root.querySelector("[data-cancel-task-form]").addEventListener("click", () => {
    taskForm.reset();
    taskForm.hidden = true;
  });

  taskForm.addEventListener("submit", event => {
    event.preventDefault();
    const data = new FormData(taskForm);
    const title = String(data.get("title") || "").trim();
    const projectId = String(data.get("projectId") || "");
    if (!title || !projectId) return;
    state.tasks.push({
      id: uid("t"),
      projectId,
      title,
      day: String(data.get("day") || ""),
      completed: false
    });
    openProjects.add(projectId);
    taskForm.reset();
    daySelect.value = todayDayId();
    taskForm.hidden = true;
    save();
    render();
    announce("Task added.");
  });

  root.querySelector("[data-add-project]").addEventListener("click", () => {
    const title = window.prompt("Name of the new project");
    if (title == null) return;
    const value = title.trim();
    if (!value) return;
    const project = { id: uid("p"), title: value };
    state.projects.push(project);
    openProjects.add(project.id);
    save();
    render();
    announce("Project added.");
  });

  /* ---------- overflow menu ---------- */

  const menu = root.querySelector("[data-menu]");
  const menuToggle = menu.querySelector("[data-menu-toggle]");
  const menuPanel = menu.querySelector("[data-menu-panel]");

  const closeMenu = () => {
    menuPanel.hidden = true;
    menuToggle.setAttribute("aria-expanded", "false");
  };

  menuToggle.addEventListener("click", () => {
    const open = menuPanel.hidden;
    menuPanel.hidden = !open;
    menuToggle.setAttribute("aria-expanded", String(open));
  });

  document.addEventListener("click", event => {
    if (!menu.contains(event.target)) closeMenu();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeMenu();
  });

  const BACKUP_NAME = "weekly-planner-backup.json";

  const downloadBackup = json => {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = BACKUP_NAME;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    announce("Backup downloaded.");
  };

  root.querySelector("[data-export]").addEventListener("click", async () => {
    closeMenu();
    const json = JSON.stringify(state, null, 2);
    // Some hosts (a published Claude artifact, for one) block a page from
    // starting its own download and mediate saves instead.
    if (window.claude && typeof window.claude.use === "function") {
      try {
        const downloads = await window.claude.use("downloads");
        if (downloads) {
          await downloads.save({ filename: BACKUP_NAME, data: json });
          announce("Backup saved.");
          return;
        }
      } catch (error) {
        announce(
          error && error.code === "declined"
            ? "Backup cancelled."
            : "The backup could not be saved here."
        );
        return;
      }
    }
    downloadBackup(json);
  });

  const importInput = root.querySelector("[data-import-input]");
  root.querySelector("[data-import]").addEventListener("click", () => {
    closeMenu();
    importInput.click();
  });
  importInput.addEventListener("change", () => {
    const file = importInput.files && importInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = sanitize(JSON.parse(String(reader.result)));
        if (!parsed) throw new Error("bad file");
        state = parsed;
        openProjects = new Set(state.projects.slice(0, 1).map(p => p.id));
        editingTaskId = null;
        renamingProjectId = null;
        save();
        render();
        announce("Backup imported.");
      } catch (error) {
        window.alert("That file could not be read as a planner backup.");
      }
    };
    reader.readAsText(file);
    importInput.value = "";
  });

  root.querySelector("[data-clear-done]").addEventListener("click", () => {
    closeMenu();
    const done = state.tasks.filter(t => t.completed).length;
    if (!done) {
      announce("Nothing completed yet.");
      return;
    }
    if (!window.confirm("Remove " + done + " completed task" + (done === 1 ? "" : "s") + "?")) return;
    state.tasks = state.tasks.filter(t => !t.completed);
    save();
    render();
    announce("Completed tasks removed.");
  });

  root.querySelector("[data-reset]").addEventListener("click", () => {
    closeMenu();
    if (!window.confirm("Delete every project and task and start with an empty planner?")) return;
    state = { projects: [{ id: uid("p"), title: "My tasks" }], tasks: [] };
    openProjects = new Set(state.projects.map(p => p.id));
    editingTaskId = null;
    renamingProjectId = null;
    save();
    render();
    announce("Planner cleared.");
  });

  /* ---------- go ---------- */

  root.querySelector("[data-today]").textContent = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  });

  render();
})();
