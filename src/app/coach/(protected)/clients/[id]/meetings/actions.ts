"use server";

import { notFound, redirect } from "next/navigation";
import { requireCoach } from "@/lib/dal";
import { findClientById } from "@/lib/repo/clients";
import { createMeeting, updateMeeting, deleteMeeting } from "@/lib/repo/meetings";
import type { MeetingType, MeetingStatus } from "@/lib/enums";
import { parseOptionalText, parseOptionalNotes } from "@/lib/formHelpers";

function path(clientId: string) {
  return `/coach/clients/${clientId}/meetings`;
}

async function assertClient(clientId: string) {
  await requireCoach();
  if (!(await findClientById(clientId))) notFound();
}

function fieldsFrom(formData: FormData) {
  return {
    type: String(formData.get("type") || "Foundation") as MeetingType,
    scheduledAt: parseOptionalText(formData, "scheduledAt"),
    status: String(formData.get("status") || "scheduled") as MeetingStatus,
    coachNotes: parseOptionalNotes(formData, "coachNotes"),
    clientActionItems: parseOptionalNotes(formData, "clientActionItems"),
    nextMeetingDate: parseOptionalText(formData, "nextMeetingDate"),
  };
}

export async function addMeeting(clientId: string, formData: FormData) {
  await assertClient(clientId);
  await createMeeting(clientId, fieldsFrom(formData));
  redirect(path(clientId));
}

export async function saveMeeting(clientId: string, formData: FormData) {
  await assertClient(clientId);
  const id = String(formData.get("id") || "");
  await updateMeeting(id, fieldsFrom(formData));
  redirect(path(clientId));
}

export async function removeMeeting(clientId: string, formData: FormData) {
  await assertClient(clientId);
  await deleteMeeting(String(formData.get("id") || ""));
  redirect(path(clientId));
}
