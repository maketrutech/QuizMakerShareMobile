import { io, Socket } from "socket.io-client";
import { API_URL } from "../config/api";

const SOCKET_BASE_URL = API_URL.replace(/\/api\/?$/, "");

export type MultiplayerPlayer = {
  userId: number;
  socketId: string;
  username: string;
  avatar?: string;
  avatarUrl?: string;
  countryId?: number | null;
  country?: {
    id: number;
    key: string;
    name: string;
    flagUrl?: string | null;
  } | null;
  score: number;
  points: number;
  hasAnsweredCurrent?: boolean;
  isVirtual?: boolean;
  isConnected: boolean;
};

export type MultiplayerRoomState = {
  roomId: string | null;
  themeId?: number;
  quiz?: {
    id: number;
    name: string;
  } | null;
  phase: string;
  presenterState?: "idle" | "speaking";
  currentQuestionIndex?: number;
  totalQuestions?: number;
  lockedSocketId?: string | null;
  answerDeadlineAt?: number | null;
  waitingCount?: number;
  requiredCount?: number;
  players: MultiplayerPlayer[];
};

export type MultiplayerQuestion = {
  id: number;
  questionText: string;
  answers: Array<{
    id: number;
    answerText: string;
  }>;
};

let multiplayerSocket: Socket | null = null;

export const connectMultiplayerSocket = async (token: string) => {
  if (multiplayerSocket?.connected) {
    return multiplayerSocket;
  }

  if (!multiplayerSocket) {
    multiplayerSocket = io(SOCKET_BASE_URL, {
      autoConnect: false,
      transports: ["websocket"],
      auth: { token },
    });
  } else {
    multiplayerSocket.auth = { token };
  }

  return await new Promise<Socket>((resolve, reject) => {
    const handleConnect = () => {
      multiplayerSocket?.off("connect_error", handleError);
      resolve(multiplayerSocket as Socket);
    };

    const handleError = (error: Error) => {
      multiplayerSocket?.off("connect", handleConnect);
      reject(error);
    };

    multiplayerSocket?.once("connect", handleConnect);
    multiplayerSocket?.once("connect_error", handleError);
    multiplayerSocket?.connect();
  });
};

export const getMultiplayerSocket = () => multiplayerSocket;

export const disconnectMultiplayerSocket = () => {
  multiplayerSocket?.disconnect();
  multiplayerSocket = null;
};

export const leaveMultiplayerRoom = () => {
  multiplayerSocket?.emit("multiplayer:leave");
};

export const joinMultiplayerMatchmaking = (payload: { themeId: number; language: string }) => {
  multiplayerSocket?.emit("multiplayer:matchmaking:join", payload);
};

export const buzzMultiplayer = (roomId?: string | null) => {
  multiplayerSocket?.emit("multiplayer:buzz", { roomId });
};

export const submitMultiplayerAnswer = (payload: { roomId?: string | null; questionId: number; answerId: number }) => {
  multiplayerSocket?.emit("multiplayer:answer", payload);
};

export const getPresenterImageUrl = (state: "idle" | "speaking" = "idle") => {
  const filename = state === "speaking" ? "presentator2.png" : "presentator1.png";
  return `${SOCKET_BASE_URL}/public/presentator/${filename}`;
};