import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Plus, 
  Trash2, 
  Calendar, 
  Repeat, 
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  deleteDoc,
  Timestamp,
  orderBy
} from 'firebase/firestore';

type RecurrenceInterval = 'daily' | 'weekly' | 'monthly' | 'custom';

interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: 'pending' | 'completed';
  dueDate?: Timestamp;
  isRecurring: boolean;
  recurrenceInterval?: RecurrenceInterval;
  recurrenceValue?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export default function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  // New Task Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState<RecurrenceInterval>('daily');
  const [recurrenceValue, setRecurrenceValue] = useState(1);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'tasks'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskList: Task[] = [];
      snapshot.forEach((doc) => {
        taskList.push({ id: doc.id, ...doc.data() } as Task);
      });
      setTasks(taskList);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tasks');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !auth.currentUser) return;

    try {
      const taskData: any = {
        userId: auth.currentUser.uid,
        title: newTitle,
        description: newDesc,
        status: 'pending',
        isRecurring,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (newDueDate) {
        taskData.dueDate = Timestamp.fromDate(new Date(newDueDate));
      }

      if (isRecurring) {
        taskData.recurrenceInterval = recurrenceInterval;
        taskData.recurrenceValue = recurrenceValue;
      }

      await addDoc(collection(db, 'tasks'), taskData);
      
      // Reset Form
      setNewTitle('');
      setNewDesc('');
      setNewDueDate('');
      setIsRecurring(false);
      setRecurrenceInterval('daily');
      setRecurrenceValue(1);
      setIsAdding(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'tasks');
    }
  };

  const toggleTaskStatus = async (task: Task) => {
    try {
      const taskRef = doc(db, 'tasks', task.id);
      const newStatus = task.status === 'pending' ? 'completed' : 'pending';
      
      const updates: any = {
        status: newStatus,
        updatedAt: serverTimestamp()
      };

      // If completing a recurring task, calculate next due date
      if (newStatus === 'completed' && task.isRecurring && task.dueDate) {
        const nextDate = new Date(task.dueDate.toDate());
        
        if (task.recurrenceInterval === 'daily') {
          nextDate.setDate(nextDate.getDate() + (task.recurrenceValue || 1));
        } else if (task.recurrenceInterval === 'weekly') {
          nextDate.setDate(nextDate.getDate() + 7 * (task.recurrenceValue || 1));
        } else if (task.recurrenceInterval === 'monthly') {
          nextDate.setMonth(nextDate.getMonth() + (task.recurrenceValue || 1));
        } else if (task.recurrenceInterval === 'custom') {
          nextDate.setDate(nextDate.getDate() + (task.recurrenceValue || 1));
        }

        // In a real app, we might create a NEW task and keep the old one as completed.
        // For this UI, we'll just update the due date and set status back to pending
        // to simulate the "next occurrence".
        updates.dueDate = Timestamp.fromDate(nextDate);
        updates.status = 'pending';
      }

      await updateDoc(taskRef, updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${task.id}`);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tasks/${id}`);
    }
  };

  const formatDate = (timestamp?: Timestamp) => {
    if (!timestamp) return '';
    return timestamp.toDate().toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Task Management</h1>
          <p className="text-sm text-gray-400 mt-1">Manage your activities and recurring schedules</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-black font-medium hover:bg-emerald-600 transition-colors"
        >
          {isAdding ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {isAdding ? 'Cancel' : 'New Task'}
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleAddTask} className="bg-[#141414] border border-white/10 rounded-xl p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Title</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="What needs to be done?"
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Due Date</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Description</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Optional details..."
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 h-20 resize-none"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div 
                    onClick={() => setIsRecurring(!isRecurring)}
                    className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isRecurring ? 'bg-emerald-500 border-emerald-500' : 'border-white/20 group-hover:border-white/40'}`}
                  >
                    {isRecurring && <CheckCircle2 className="w-3 h-3 text-black" />}
                  </div>
                  <span className="text-sm text-gray-300">Recurring Task</span>
                </label>

                {isRecurring && (
                  <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2">
                    <select
                      value={recurrenceInterval}
                      onChange={(e) => setRecurrenceInterval(e.target.value as RecurrenceInterval)}
                      className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="custom">Custom Days</option>
                    </select>
                    {recurrenceInterval === 'custom' && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">Every</span>
                        <input
                          type="number"
                          min="1"
                          value={recurrenceValue}
                          onChange={(e) => setRecurrenceValue(parseInt(e.target.value))}
                          className="w-16 bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                        />
                        <span className="text-xs text-gray-400">days</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-6 py-2 rounded-lg bg-emerald-500 text-black font-medium hover:bg-emerald-600 transition-colors"
                >
                  Create Task
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 border border-white/10 rounded-xl bg-[#0a0a0a] overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8 text-center">
            <CheckCircle2 className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">No tasks found</p>
            <p className="text-sm">Start by adding a new task or recurring activity.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {tasks.map((task) => (
              <motion.div
                layout
                key={task.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`group flex items-start gap-4 p-4 rounded-xl border transition-all ${
                  task.status === 'completed' 
                    ? 'bg-black/20 border-white/5 opacity-60' 
                    : 'bg-[#141414] border-white/10 hover:border-emerald-500/30'
                }`}
              >
                <button
                  onClick={() => toggleTaskStatus(task)}
                  className={`mt-0.5 shrink-0 transition-colors ${
                    task.status === 'completed' ? 'text-emerald-500' : 'text-gray-500 hover:text-emerald-400'
                  }`}
                >
                  {task.status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`font-medium text-sm truncate ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-white'}`}>
                      {task.title}
                    </h3>
                    {task.isRecurring && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-wider">
                        <Repeat className="w-3 h-3" /> {task.recurrenceInterval}
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-xs text-gray-400 line-clamp-2 mb-2">{task.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-[10px] text-gray-500 font-medium uppercase tracking-widest">
                    {task.dueDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {formatDate(task.dueDate)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Created {formatDate(task.createdAt)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => deleteTask(task.id)}
                  className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
