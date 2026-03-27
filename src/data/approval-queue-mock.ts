import data from "./approval-queue.json";
import type { ApprovalItem } from "@/types/approval-queue";

export const approvalQueueItems = data.approvalQueueItems as ApprovalItem[];
