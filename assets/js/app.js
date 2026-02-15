// Supabase config (reads from window.__ENV, falls back to placeholders)
      const env = window.__ENV || {};
      const SUPABASE_URL =
        env.SUPABASE_URL || "https://YOUR-PROJECT.supabase.co";
      const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY || "YOUR-ANON-KEY";
      const SUPABASE_TABLE = env.SUPABASE_TABLE || "task_state";
      const SUPABASE_ROW_ID = env.SUPABASE_ROW_ID || "task_state_singleton";

      let supabaseClient = null;

      // Data structure
      let tasks = [];
      let archivedTasks = [];
      let currentFilter = "all";
      let currentTaskId = null;
      let editingTaskId = null;
      let calendarDate = new Date();

      // Initialize
      document.addEventListener("DOMContentLoaded", () => {
        loadLocalData();
        setTodayDate();
        renderTasks();
        updateDashboard();
        setupEventListeners();
        initSupabase();
        loadRemoteTasks();
        checkReminders();
        setInterval(checkReminders, 60000); // Check every minute
      });

      function initSupabase() {
        if (
          !window.supabase ||
          !SUPABASE_URL ||
          SUPABASE_URL.includes("YOUR-PROJECT") ||
          !SUPABASE_ANON_KEY ||
          SUPABASE_ANON_KEY.includes("YOUR-ANON")
        ) {
          console.warn("Supabase is not configured; continuing with local storage only.");
          return null;
        }

        supabaseClient = window.supabase.createClient(
          SUPABASE_URL,
          SUPABASE_ANON_KEY
        );
        return supabaseClient;
      }

      function loadLocalData() {
        try {
          const tasksData = localStorage.getItem("tasks");
          const archivedData = localStorage.getItem("archivedTasks");
          tasks = tasksData ? JSON.parse(tasksData) : [];
          archivedTasks = archivedData ? JSON.parse(archivedData) : [];
        } catch (error) {
          console.error("Error loading local data:", error);
          tasks = [];
          archivedTasks = [];
        }
      }

      async function loadRemoteTasks() {
        if (!supabaseClient) return;

        const { data, error } = await supabaseClient
          .from(SUPABASE_TABLE)
          .select("tasks, archived_tasks")
          .eq("id", SUPABASE_ROW_ID)
          .single();

        if (error) {
          // PGRST116 means no rows returned; ignore so we can create on first save.
          if (error.code !== "PGRST116") {
            console.error("Supabase load failed", error.message);
          }
          return;
        }

        if (data) {
          // Validate data structure
          tasks = Array.isArray(data.tasks) ? data.tasks : [];
          archivedTasks = Array.isArray(data.archived_tasks) ? data.archived_tasks : [];
          localStorage.setItem("tasks", JSON.stringify(tasks));
          localStorage.setItem(
            "archivedTasks",
            JSON.stringify(archivedTasks)
          );
          renderTasks();
          updateDashboard();
        }
      }

      async function persistTasksToSupabase() {
        if (!supabaseClient) return;

        const payload = {
          id: SUPABASE_ROW_ID,
          tasks,
          archived_tasks: archivedTasks,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabaseClient
          .from(SUPABASE_TABLE)
          .upsert(payload, { onConflict: "id" });

        if (error) {
          console.error("Supabase save failed", error.message);
        }
      }

      function setTodayDate() {
        const today = new Date().toISOString().split("T")[0];
        document.getElementById("startDate").value = today;
        document.getElementById("dueDate").value = today;
      }

      function setupEventListeners() {
        // Modal controls
        document.getElementById("addTaskBtn").addEventListener("click", () => {
          editingTaskId = null;
          document.getElementById("modalTitle").textContent = "Add New Task";
          document.getElementById("taskForm").reset();
          setTodayDate();
          document.getElementById("subtaskList").innerHTML = "";
          document.getElementById("taskModal").classList.add("active");
        });

        document.getElementById("closeModal").addEventListener("click", () => {
          document.getElementById("taskModal").classList.remove("active");
        });

        document.getElementById("cancelBtn").addEventListener("click", () => {
          document.getElementById("taskModal").classList.remove("active");
        });

        document
          .getElementById("closeDetailModal")
          .addEventListener("click", () => {
            document
              .getElementById("taskDetailModal")
              .classList.remove("active");
          });

        // Form submission
        document
          .getElementById("taskForm")
          .addEventListener("submit", handleTaskSubmit);

        // Filter buttons
        document.querySelectorAll(".filter-btn").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            document
              .querySelectorAll(".filter-btn")
              .forEach((b) => b.classList.remove("active"));
            e.target.closest(".filter-btn").classList.add("active");
            currentFilter = e.target.closest(".filter-btn").dataset.filter;

            if (currentFilter === "calendar") {
              document.getElementById("taskListView").classList.add("hidden");
              document
                .getElementById("calendarView")
                .classList.remove("hidden");
              renderCalendar();
            } else {
              document
                .getElementById("taskListView")
                .classList.remove("hidden");
              document.getElementById("calendarView").classList.add("hidden");
              renderTasks();
            }
          });
        });

        // Dark mode toggle
        document
          .getElementById("darkModeToggle")
          .addEventListener("click", () => {
            document.body.classList.toggle("dark-mode");
            const icon = document.querySelector("#darkModeToggle i");
            icon.classList.toggle("fa-moon");
            icon.classList.toggle("fa-sun");
            localStorage.setItem(
              "darkMode",
              document.body.classList.contains("dark-mode")
            );
          });

        // Load dark mode preference
        if (localStorage.getItem("darkMode") === "true") {
          document.body.classList.add("dark-mode");
          document
            .querySelector("#darkModeToggle i")
            .classList.replace("fa-moon", "fa-sun");
        }

        // Search
        document.getElementById("searchBtn").addEventListener("click", () => {
          document.getElementById("searchBar").classList.toggle("hidden");
          document.getElementById("searchInput").focus();
        });

        document
          .getElementById("searchInput")
          .addEventListener("input", (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredTasks = tasks.filter(
              (task) =>
                task.title.toLowerCase().includes(searchTerm) ||
                task.description.toLowerCase().includes(searchTerm) ||
                task.tags.some((tag) => tag.toLowerCase().includes(searchTerm))
            );
            renderFilteredTasks(filteredTasks);
          });

        // Subtasks
        document
          .getElementById("addSubtask")
          .addEventListener("click", addSubtaskInput);

        // Archive toggle
        document
          .getElementById("archiveToggle")
          .addEventListener("click", showArchive);

        // Calendar navigation
        document.getElementById("prevMonth").addEventListener("click", () => {
          calendarDate.setMonth(calendarDate.getMonth() - 1);
          renderCalendar();
        });

        document.getElementById("nextMonth").addEventListener("click", () => {
          calendarDate.setMonth(calendarDate.getMonth() + 1);
          renderCalendar();
        });

        // Task detail actions
        document.getElementById("editTaskBtn").addEventListener("click", () => {
          document.getElementById("taskDetailModal").classList.remove("active");
          editTask(currentTaskId);
        });

        document
          .getElementById("deleteTaskBtn")
          .addEventListener("click", () => {
            if (confirm("Are you sure you want to delete this task?")) {
              deleteTask(currentTaskId);
              document
                .getElementById("taskDetailModal")
                .classList.remove("active");
            }
          });

        document
          .getElementById("archiveTaskBtn")
          .addEventListener("click", () => {
            archiveTask(currentTaskId);
            document
              .getElementById("taskDetailModal")
              .classList.remove("active");
          });
      }

      function handleTaskSubmit(e) {
        e.preventDefault();

        // Input validation
        const title = document.getElementById("taskTitle").value.trim();
        const startDate = document.getElementById("startDate").value;
        const dueDate = document.getElementById("dueDate").value;

        if (!title) {
          alert("Task title is required!");
          return;
        }

        if (!startDate || !dueDate) {
          alert("Start date and due date are required!");
          return;
        }

        if (new Date(dueDate) < new Date(startDate)) {
          alert("Due date cannot be before start date!");
          return;
        }

        const subtasks = [];
        document.querySelectorAll(".subtask-input").forEach((input) => {
          if (input.value.trim()) {
            subtasks.push({
              id: Date.now() + Math.random(),
              text: input.value.trim(),
              completed: false,
            });
          }
        });

        const task = {
          id: editingTaskId || Date.now(),
          title: title,
          description: document.getElementById("taskDescription").value.trim(),
          startDate: document.getElementById("startDate").value,
          startTime: document.getElementById("startTime").value,
          dueDate: document.getElementById("dueDate").value,
          category: document.getElementById("category").value,
          priority: document.getElementById("priority").value,
          status: document.getElementById("status").value,
          tags: document
            .getElementById("tags")
            .value.split(",")
            .map((t) => t.trim())
            .filter((t) => t),
          subtasks: subtasks,
          enableReminder: document.getElementById("enableReminder").checked,
          createdAt: editingTaskId
            ? tasks.find((t) => t.id === editingTaskId)?.createdAt
            : new Date().toISOString(),
          completedAt: null,
          timeTracked: editingTaskId
            ? tasks.find((t) => t.id === editingTaskId)?.timeTracked || 0
            : 0,
          timerRunning: false,
        };

        if (editingTaskId) {
          const index = tasks.findIndex((t) => t.id === editingTaskId);
          tasks[index] = { ...tasks[index], ...task };
        } else {
          tasks.push(task);
        }

        saveTasks();
        renderTasks();
        updateDashboard();
        document.getElementById("taskModal").classList.remove("active");
        document.getElementById("taskForm").reset();
      }

      function addSubtaskInput() {
        const subtaskList = document.getElementById("subtaskList");
        const div = document.createElement("div");
        div.className = "flex items-center space-x-2";
        div.innerHTML = `
                <input type="text" class="subtask-input flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none" placeholder="Subtask...">
                <button type="button" class="text-red-500 hover:text-red-700" onclick="this.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            `;
        subtaskList.appendChild(div);
      }

      function renderTasks() {
        const taskList = document.getElementById("taskList");
        const emptyState = document.getElementById("emptyState");

        let filteredTasks = filterTasks();

        if (filteredTasks.length === 0) {
          taskList.innerHTML = "";
          emptyState.classList.remove("hidden");
          return;
        }

        emptyState.classList.add("hidden");
        renderFilteredTasks(filteredTasks);
      }

      function renderFilteredTasks(filteredTasks) {
        const taskList = document.getElementById("taskList");

        taskList.innerHTML = filteredTasks
          .map((task) => {
            const isOverdue =
              new Date(task.dueDate) < new Date() &&
              task.status !== "completed";
            const completedSubtasks = task.subtasks
              ? task.subtasks.filter((s) => s.completed).length
              : 0;
            const totalSubtasks = task.subtasks ? task.subtasks.length : 0;

            return `
                    <div class="task-item bg-white dark:bg-slate-800 rounded-lg shadow p-4 border-l-4 priority-${
                      task.priority
                    } ${task.status === "completed" ? "completed" : ""}"
                         onclick="showTaskDetail('${task.id}')">
                        <div class="flex items-start justify-between">
                            <div class="flex items-start space-x-3 flex-1">
                                <input type="checkbox" class="mt-1 w-5 h-5 text-purple-600" 
                                       ${
                                         task.status === "completed"
                                           ? "checked"
                                           : ""
                                       }
                                       onclick="event.stopPropagation(); toggleTaskComplete('${
                                         task.id
                                       }')"
                                       onchange="event.stopPropagation()">
                                <div class="flex-1">
                                    <h3 class="task-title font-semibold text-lg mb-1">${escapeHtml(
                                      task.title
                                    )}</h3>
                                    ${
                                      task.description
                                        ? `<p class="text-sm text-gray-600 dark:text-gray-400 mb-2">${escapeHtml(task.description)}</p>`
                                        : ""
                                    }
                                    <div class="flex flex-wrap gap-2 items-center text-sm">
                                        <span class="badge badge-${
                                          task.status
                                        }">${task.status.toUpperCase()}</span>
                                        <span class="text-gray-600 dark:text-gray-400">
                                            <i class="fas fa-calendar mr-1"></i>${formatDate(
                                              task.dueDate
                                            )}
                                        </span>
                                        <span class="text-gray-600 dark:text-gray-400">
                                            <i class="fas fa-folder mr-1"></i>${
                                              task.category
                                            }
                                        </span>
                                        ${
                                          isOverdue
                                            ? '<span class="text-red-600 font-semibold"><i class="fas fa-exclamation-circle mr-1"></i>OVERDUE</span>'
                                            : ""
                                        }
                                        ${
                                          totalSubtasks > 0
                                            ? `<span class="text-gray-600 dark:text-gray-400"><i class="fas fa-tasks mr-1"></i>${completedSubtasks}/${totalSubtasks}</span>`
                                            : ""
                                        }
                                    </div>
                                    ${
                                      task.tags.length > 0
                                        ? `
                                        <div class="mt-2">
                                            ${task.tags
                                              .map(
                                                (tag) =>
                                                  `<span class="tag">#${escapeHtml(tag)}</span>`
                                              )
                                              .join("")}
                                        </div>
                                    `
                                        : ""
                                    }
                                </div>
                            </div>
                            <div class="flex items-center space-x-2">
                                <button onclick="event.stopPropagation(); startTimer('${
                                  task.id
                                }')" 
                                        class="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded" 
                                        title="Start Timer">
                                    <i class="fas fa-play text-green-600"></i>
                                </button>
                                <button onclick="event.stopPropagation(); editTask('${
                                  task.id
                                }')" 
                                        class="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded">
                                    <i class="fas fa-edit text-blue-600"></i>
                                </button>
                            </div>
                        </div>
                        ${
                          task.timeTracked > 0
                            ? `
                            <div class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                <i class="fas fa-clock mr-1"></i>Time tracked: ${formatTime(
                                  task.timeTracked
                                )}
                            </div>
                        `
                            : ""
                        }
                    </div>
                `;
          })
          .join("");
      }

      function filterTasks() {
        const today = new Date().toISOString().split("T")[0];

        switch (currentFilter) {
          case "today":
            return tasks.filter((t) => t.dueDate === today);
          case "high":
            return tasks.filter((t) => t.priority === "high");
          case "overdue":
            return tasks.filter(
              (t) =>
                new Date(t.dueDate) < new Date() && t.status !== "completed"
            );
          case "completed":
            return tasks.filter((t) => t.status === "completed");
          case "work":
          case "personal":
          case "school":
            return tasks.filter((t) => t.category === currentFilter);
          default:
            return tasks;
        }
      }

      // XSS protection: escape HTML
      function escapeHtml(text) {
        if (!text) return "";
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
      }

      function showTaskDetail(taskId) {
        const task = tasks.find((t) => t.id == taskId);
        if (!task) return;

        currentTaskId = taskId;
        const isOverdue =
          new Date(task.dueDate) < new Date() && task.status !== "completed";

        document.getElementById("detailTaskTitle").textContent = escapeHtml(task.title);
        document.getElementById("taskDetailContent").innerHTML = `
                <div class="space-y-4">
                    ${
                      task.description
                        ? `
                        <div>
                            <h3 class="font-semibold mb-1">Description</h3>
                            <p class="text-gray-600 dark:text-gray-400">${escapeHtml(task.description)}</p>
                        </div>
                    `
                        : ""
                    }
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <h3 class="font-semibold mb-1">Start Date</h3>
                            <p class="text-gray-600 dark:text-gray-400">${formatDate(
                              task.startDate
                            )} ${task.startTime || ""}</p>
                        </div>
                        <div>
                            <h3 class="font-semibold mb-1">Due Date</h3>
                            <p class="text-gray-600 dark:text-gray-400 ${
                              isOverdue ? "text-red-600 font-semibold" : ""
                            }">${formatDate(task.dueDate)}</p>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <h3 class="font-semibold mb-1">Category</h3>
                            <p class="text-gray-600 dark:text-gray-400">${
                              task.category
                            }</p>
                        </div>
                        <div>
                            <h3 class="font-semibold mb-1">Priority</h3>
                            <p class="text-gray-600 dark:text-gray-400">${task.priority.toUpperCase()}</p>
                        </div>
                    </div>
                    
                    <div>
                        <h3 class="font-semibold mb-1">Status</h3>
                        <span class="badge badge-${
                          task.status
                        }">${task.status.toUpperCase()}</span>
                    </div>
                    
                    ${
                      task.tags.length > 0
                        ? `
                        <div>
                            <h3 class="font-semibold mb-1">Tags</h3>
                            <div>${task.tags
                              .map((tag) => `<span class="tag">#${escapeHtml(tag)}</span>`)
                              .join("")}</div>
                        </div>
                    `
                        : ""
                    }
                    
                    ${
                      task.subtasks && task.subtasks.length > 0
                        ? `
                        <div>
                            <h3 class="font-semibold mb-2">Subtasks</h3>
                            ${task.subtasks
                              .map(
                                (sub) => `
                                <div class="subtask-item flex items-center space-x-2 mb-2">
                                    <input type="checkbox" ${
                                      sub.completed ? "checked" : ""
                                    } 
                                           onchange="toggleSubtask('${
                                             task.id
                                           }', '${sub.id}')"
                                           class="w-4 h-4">
                                    <span class="${
                                      sub.completed
                                        ? "line-through text-gray-500"
                                        : ""
                                    }">${escapeHtml(sub.text)}</span>
                                </div>
                            `
                              )
                              .join("")}
                        </div>
                    `
                        : ""
                    }
                    
                    ${
                      task.timeTracked > 0
                        ? `
                        <div>
                            <h3 class="font-semibold mb-1">Time Tracked</h3>
                            <p class="timer">${formatTime(task.timeTracked)}</p>
                        </div>
                    `
                        : ""
                    }
                    
                    <div class="text-sm text-gray-500">
                        Created: ${formatDateTime(task.createdAt)}
                    </div>
                </div>
            `;

        document.getElementById("taskDetailModal").classList.add("active");
      }

      function toggleTaskComplete(taskId) {
        const task = tasks.find((t) => t.id == taskId);
        if (!task) return;
        if (task.status === "completed") {
          task.status = "pending";
          task.completedAt = null;
        } else {
          task.status = "completed";
          task.completedAt = new Date().toISOString();
        }
        saveTasks();
        renderTasks();
        updateDashboard();
      }

      function toggleSubtask(taskId, subtaskId) {
        const task = tasks.find((t) => t.id == taskId);
        if (!task || !task.subtasks) return;
        const subtask = task.subtasks.find((s) => s.id == subtaskId);
        if (!subtask) return;
        subtask.completed = !subtask.completed;
        saveTasks();
        showTaskDetail(taskId); // Refresh detail view
      }

      function editTask(taskId) {
        const task = tasks.find((t) => t.id == taskId);
        if (!task) return;

        editingTaskId = taskId;
        document.getElementById("modalTitle").textContent = "Edit Task";

        // Fill form with task data
        document.getElementById("taskTitle").value = task.title;
        document.getElementById("taskDescription").value = task.description;
        document.getElementById("startDate").value = task.startDate;
        document.getElementById("startTime").value = task.startTime || "";
        document.getElementById("dueDate").value = task.dueDate;
        document.getElementById("category").value = task.category;
        document.getElementById("priority").value = task.priority;
        document.getElementById("status").value = task.status;
        document.getElementById("tags").value = task.tags.join(", ");
        document.getElementById("enableReminder").checked = task.enableReminder;

        // Add subtasks
        const subtaskList = document.getElementById("subtaskList");
        subtaskList.innerHTML = "";
        if (task.subtasks) {
          task.subtasks.forEach((sub) => {
            const div = document.createElement("div");
            div.className = "flex items-center space-x-2";
            div.innerHTML = `
                        <input type="text" class="subtask-input flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none" value="${escapeHtml(sub.text)}">
                        <button type="button" class="text-red-500 hover:text-red-700" onclick="this.parentElement.remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    `;
            subtaskList.appendChild(div);
          });
        }

        document.getElementById("taskModal").classList.add("active");
      }

      function deleteTask(taskId) {
        if (!taskId) return;
        tasks = tasks.filter((t) => t.id != taskId);
        saveTasks();
        renderTasks();
        updateDashboard();
      }

      function archiveTask(taskId) {
        const task = tasks.find((t) => t.id == taskId);
        if (!task) return;

        archivedTasks.push({ ...task, archivedAt: new Date().toISOString() });
        tasks = tasks.filter((t) => t.id != taskId);
        saveTasks();
        renderTasks();
        updateDashboard();
      }

      function showArchive() {
        // Simple implementation - you can expand this
        alert(
          `You have ${archivedTasks.length} archived tasks.\n\n${archivedTasks
            .map((t) => `* ${t.title}`)
            .join("\n")}`
        );
      }

      let activeTimers = new Map(); // Track active timers

      function startTimer(taskId) {
        const task = tasks.find((t) => t.id == taskId);
        if (!task) return;

        if (task.timerRunning) {
          alert("Timer is already running for this task!");
          return;
        }

        const startTime = Date.now();
        task.timerRunning = true;
        task.timerStart = startTime;

        const timerInterval = setInterval(() => {
          const currentTask = tasks.find((t) => t.id == taskId);
          if (!currentTask || !currentTask.timerRunning) {
            clearInterval(timerInterval);
            activeTimers.delete(taskId);
            return;
          }

          const elapsed = Date.now() - startTime;
          currentTask.timeTracked = (currentTask.timeTracked || 0) + elapsed;
          currentTask.timerStart = Date.now();
          saveTasks();
        }, 1000);

        activeTimers.set(taskId, timerInterval);

        const stopTimer = confirm(
          `Timer started for "${task.title}". Click OK to stop.`
        );
        if (stopTimer) {
          stopTimerForTask(taskId);
        }
      }

      function stopTimerForTask(taskId) {
        const task = tasks.find((t) => t.id == taskId);
        if (!task) return;

        const interval = activeTimers.get(taskId);
        if (interval) {
          clearInterval(interval);
          activeTimers.delete(taskId);
        }

        task.timerRunning = false;
        if (task.timerStart) {
          const elapsed = Date.now() - task.timerStart;
          task.timeTracked = (task.timeTracked || 0) + elapsed;
        }
        saveTasks();
        renderTasks();
      }

      function updateDashboard() {
        const today = new Date().toISOString().split("T")[0];

        // Total tasks
        document.getElementById("totalTasks").textContent = tasks.length;

        // Completed today
        const completedToday = tasks.filter(
          (t) =>
            t.status === "completed" &&
            t.completedAt &&
            t.completedAt.split("T")[0] === today
        ).length;
        document.getElementById("completedToday").textContent = completedToday;

        // Overdue tasks
        const overdue = tasks.filter(
          (t) => new Date(t.dueDate) < new Date() && t.status !== "completed"
        ).length;
        document.getElementById("overdueTasks").textContent = overdue;

        // Productivity score
        const completed = tasks.filter((t) => t.status === "completed").length;
        const score =
          tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
        document.getElementById("productivityScore").textContent = score + "%";

        // Progress bar
        document.getElementById("progressText").textContent = score + "%";
        document.getElementById("progressFill").style.width = score + "%";

        // Archive count
        document.getElementById("archiveCount").textContent =
          archivedTasks.length;
      }

      function checkReminders() {
        if (!("Notification" in window)) return;
        
        const now = new Date();
        const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

        tasks.forEach((task) => {
          if (!task || !task.enableReminder || task.status === "completed" || !task.dueDate) return;

          try {
            const dueDateTime = new Date(
              task.dueDate + " " + (task.startTime || "00:00")
            );

            if (isNaN(dueDateTime.getTime())) return;

            if (dueDateTime > now && dueDateTime <= oneHourFromNow) {
              if (Notification.permission === "granted") {
                new Notification("Task Reminder", {
                  body: `"${task.title || "Task"}" is due in less than 1 hour!`,
                  icon: "https://cdn-icons-png.flaticon.com/512/2965/2965358.png",
                });
              } else if (Notification.permission !== "denied") {
                Notification.requestPermission();
              }
            }
          } catch (error) {
            console.error("Error checking reminder for task:", error);
          }
        });
      }

      function renderCalendar() {
        const year = calendarDate.getFullYear();
        const month = calendarDate.getMonth();

        document.getElementById("calendarMonth").textContent = new Date(
          year,
          month
        ).toLocaleDateString("en-US", { month: "long", year: "numeric" });

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const grid = document.getElementById("calendarGrid");
        grid.innerHTML = "";

        // Empty cells before first day
        for (let i = 0; i < firstDay; i++) {
          grid.innerHTML += '<div class="calendar-day"></div>';
        }

        // Days of month
        for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = `${year}-${String(month + 1).padStart(
            2,
            "0"
          )}-${String(day).padStart(2, "0")}`;
          const tasksOnDay = tasks.filter((t) => t.dueDate === dateStr);
          const hasHighPriority = tasksOnDay.some((t) => t.priority === "high");

          grid.innerHTML += `
                    <div class="calendar-day ${
                      tasksOnDay.length > 0 ? "has-tasks" : ""
                    }" 
                         onclick="filterTasksByDate('${dateStr}')">
                        <div class="font-semibold">${day}</div>
                        ${
                          tasksOnDay.length > 0
                            ? `
                            <div class="text-xs mt-1">
                                ${tasksOnDay.length} task${
                                tasksOnDay.length > 1 ? "s" : ""
                              }
                                ${
                                  hasHighPriority
                                    ? '<i class="fas fa-fire text-red-500"></i>'
                                    : ""
                                }
                            </div>
                        `
                            : ""
                        }
                    </div>
                `;
        }
      }

      function filterTasksByDate(date) {
        if (!date) return;
        const tasksOnDate = tasks.filter((t) => t && t.dueDate === date);
        if (tasksOnDate.length === 0) {
          alert("No tasks on this date");
          return;
        }

        const calendarView = document.getElementById("calendarView");
        const taskListView = document.getElementById("taskListView");
        if (calendarView) calendarView.classList.add("hidden");
        if (taskListView) taskListView.classList.remove("hidden");
        renderFilteredTasks(tasksOnDate);
      }

      function saveTasks() {
        try {
          localStorage.setItem("tasks", JSON.stringify(tasks));
          localStorage.setItem("archivedTasks", JSON.stringify(archivedTasks));
          persistTasksToSupabase();
        } catch (error) {
          console.error("Error saving tasks:", error);
          // Try to persist to Supabase even if localStorage fails
          persistTasksToSupabase();
        }
      }

      function formatDate(dateStr) {
        if (!dateStr) return "N/A";
        try {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return "Invalid Date";
          return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
        } catch (error) {
          console.error("Error formatting date:", error);
          return "Invalid Date";
        }
      }

      function formatDateTime(dateStr) {
        if (!dateStr) return "N/A";
        try {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return "Invalid Date";
          return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
        } catch (error) {
          console.error("Error formatting date/time:", error);
          return "Invalid Date";
        }
      }

      function formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
          return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
          return `${minutes}m ${secs}s`;
        } else {
          return `${secs}s`;
        }
      }

      // Request notification permission on load
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
