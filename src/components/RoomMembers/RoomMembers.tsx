import React, { useState } from "react";
import { Badge, Button, Menu, TextInput } from "@mantine/core";
import { Socket } from "socket.io-client";

export type ChangeRequest = {
  id: string;
  clientId: string;
  type: "changeVideo";
  video: string;
  timestamp: string;
};

const roleColor = { host: "red", moderator: "blue", participant: "gray" };

/**
 * Participant list with roles (everyone), role management (host only),
 * and the approval flow for changes participants are not allowed to make
 * directly (they request, host/moderators approve).
 * The server enforces every permission; this component only mirrors them.
 */
export const RoomMembers = ({
  socket,
  participants,
  nameMap,
  myId,
  requests,
}: {
  socket: Socket;
  participants: User[];
  nameMap: StringDict;
  myId: string;
  requests: ChangeRequest[];
}) => {
  const [video, setVideo] = useState("");
  const myRole = participants.find((p) => p.id === myId)?.role ?? "participant";
  const isHost = myRole === "host";
  const canControl = myRole !== "participant";
  const name = (id: string) => nameMap[id] || id;

  return (
    <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 8 }}>
      {participants.map((p) => {
        const role = p.role ?? "participant";
        const manageable = isHost && p.id !== myId;
        const label = (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontWeight: 600 }}>
              {name(p.id)}
              {p.id === myId ? " (you)" : ""}
            </span>
            <Badge size="sm" color={roleColor[role]}>
              {role}
            </Badge>
          </div>
        );
        if (!manageable) {
          return <div key={p.id}>{label}</div>;
        }
        return (
          <Menu key={p.id} trigger="click">
            <Menu.Target>
              <div style={{ cursor: "pointer" }}>{label}</div>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>{name(p.id)}</Menu.Label>
              {role === "participant" ? (
                <Menu.Item
                  onClick={() =>
                    socket.emit("CMD:assignRole", {
                      userId: p.id,
                      role: "moderator",
                    })
                  }
                >
                  Make moderator
                </Menu.Item>
              ) : (
                <Menu.Item
                  onClick={() =>
                    socket.emit("CMD:assignRole", {
                      userId: p.id,
                      role: "participant",
                    })
                  }
                >
                  Make participant
                </Menu.Item>
              )}
              <Menu.Item
                onClick={() => {
                  if (window.confirm(`Make ${name(p.id)} the host?`)) {
                    socket.emit("CMD:transferHost", { userId: p.id });
                  }
                }}
              >
                Transfer host
              </Menu.Item>
              <Menu.Item
                color="red"
                onClick={() =>
                  socket.emit("CMD:kickUser", { userToBeKicked: p.id })
                }
              >
                Remove from room
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        );
      })}

      {canControl && requests.length > 0 && (
        <div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            Pending requests
          </div>
          {requests.map((r) => (
            <div
              key={r.id}
              style={{ display: "flex", gap: 6, alignItems: "center" }}
            >
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                {name(r.clientId)}: {r.video}
              </span>
              <Button
                size="compact-xs"
                color="green"
                onClick={() =>
                  socket.emit("CMD:resolveRequest", { id: r.id, approve: true })
                }
              >
                Approve
              </Button>
              <Button
                size="compact-xs"
                color="red"
                onClick={() =>
                  socket.emit("CMD:resolveRequest", { id: r.id, approve: false })
                }
              >
                Reject
              </Button>
            </div>
          ))}
        </div>
      )}

      {!canControl && (
        <div style={{ display: "flex", gap: 6 }}>
          <TextInput
            style={{ flex: 1 }}
            size="xs"
            placeholder="Request a video (paste a URL)"
            value={video}
            onChange={(e) => setVideo(e.currentTarget.value)}
          />
          <Button
            size="xs"
            disabled={!video.trim()}
            onClick={() => {
              socket.emit("CMD:requestChange", { video: video.trim() });
              setVideo("");
            }}
          >
            Request
          </Button>
        </div>
      )}
    </div>
  );
};
