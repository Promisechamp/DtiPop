// backend/src/index.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import { checkConnection } from "./db/index.js";
import { setupSocketHandlers } from "./socket.js";

// DTI ROUTES
import authRoutes from "./dti/routes/authRoutes.js";
import adminRoutes from "./dti/routes/adminRoutes.js";
import itemRoutes from "./dti/routes/itemsRoutes.js";
import applicationRoutes from "./dti/routes/applicationsRoutes.js";
import winnerRoutes from "./dti/routes/winnersRoutes.js";
import shippingRoutes from "./dti/routes/shippingRoutes.js";
import userRoutes from "./dti/routes/usersRoutes.js";
import supportRoutes from "./dti/routes/supportRoutes.js";
import favoritesRoutes from "./dti/routes/favoritesRoutes.js";
import analyticsRoutes from "./dti/routes/analyticsRoutes.js";
import ratingRoutes from "./dti/routes/ratingRoutes.js";
import userSettingsRoutes from "./dti/routes/userSettingsRoutes.js";
import itemDiscussionRoutes from "./dti/routes/itemDiscussionRoutes.js";

// SHARED ROUTES
import notificationRoutes from "./shared/routes/notificationRoutes.js";
import chatRoutes from "./shared/routes/chatRoutes.js";

// POP ROUTES
import claimRoutes from "./pop/routes/claimRoutes.js";
import dashboardRoutes from "./pop/routes/dashboardRoutes.js";
import purchaseRoutes from "./pop/routes/purchaseRoutes.js";
import warrantyRoutes from "./pop/routes/warrantyRoutes.js";
import complaintRoutes from "./pop/routes/complaintRoutes.js";
import householdRoutes from "./pop/routes/householdRoutes.js";
import assetRoutes from "./pop/routes/assetRoutes.js";
import documentRoutes from "./pop/routes/documentRoutes.js";
import maintenanceRoutes from "./pop/routes/maintenanceRoutes.js";
import taskRoutes from "./pop/routes/taskRoutes.js";
import reputationRoutes from "./pop/routes/reputationRoutes.js";
import requestRoutes from "./pop/routes/requestRoutes.js";
import borrowRoutes from "./pop/routes/borrowRoutes.js";
import sharingRoutes from "./pop/routes/sharingRoutes.js";
import communityReviewRoutes from "./pop/routes/communityReviewRoutes.js";
import popChatRoutes from "./pop/routes/chatRoutes.js";
import {
	startBorrowLifecycleWorker,
	stopBorrowLifecycleWorker,
} from "./pop/services/borrowLifecycleService.js";

// ENVIRONMENT
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// HTTP & WEBSOCKET SERVER
const server = createServer(app);
const io = new Server(server, {
	cors: {
		origin: ["http://localhost:5173", "http://localhost:3000"],
		credentials: true,
	},
});

// SOCKET HANDLERS
setupSocketHandlers(io);

// NOTIFICATION SOCKET HELPER
export const sendNotification = (userId, notification) => {
	io.to(`user:${userId}`).emit("notification", notification);
	console.log(`📤 Notification sent to user ${userId}: ${notification.title}`);
	return true;
};

// EXPRESS MIDDLEWARE
app.use(
	cors({
		origin: ["http://localhost:5173", "http://localhost:3000"],
		credentials: true,
	}),
);
app.use(
	helmet({
		contentSecurityPolicy:
			process.env.NODE_ENV === "development" ? false : undefined,
	}),
);
app.use(compression());
app.use(morgan("dev"));
app.use(
	express.json({
		limit: "10mb",
	}),
);
app.use(
	express.urlencoded({
		extended: true,
		limit: "10mb",
	}),
);

// HEALTH CHECK
app.get("/api/health", async (req, res) => {
	const connected = await checkConnection();
	res.json({
		status: connected ? "OK" : "ERROR",
		timestamp: new Date().toISOString(),
		service: "donttrashit-api",
		database: connected ? "connected" : "disconnected",
	});
});

// API TEST
app.get("/api/test", (req, res) => {
	res.json({
		message: "API is working! 🚀",
		endpoints: {
			health: "/api/health",
			auth: "/api/auth",
			items: "/api/items",
			notifications: "/api/notifications",
			popNotifications: "/api/pop/notifications",
			chat: "/api/chat",
			websocket: "ws://localhost:5000",
		},
	});
});




// SHARED ROUTING
app.use("/api/notifications", notificationRoutes);
app.use("/api/pop/notifications", notificationRoutes);
app.use('/api/chat', chatRoutes);



// DTI ROUTING
app.use("/api/chat", chatRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/winners", winnerRoutes);
app.use("/api/shipping", shippingRoutes);
app.use("/api/users", userRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use("/api/admin/analytics", analyticsRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api/userSettings", userSettingsRoutes);
app.use("/api/discussions", itemDiscussionRoutes);


// POP ROUTING
app.use("/api/pop/purchases", purchaseRoutes);
app.use("/api/pop/claims", claimRoutes);
app.use("/api/pop/dashboard", dashboardRoutes);
app.use("/api/pop/warranties", warrantyRoutes);
app.use("/api/pop/complaints", complaintRoutes);
app.use("/api/pop/households", householdRoutes);
app.use("/api/pop/assets", assetRoutes);
app.use("/api/pop/documents", documentRoutes);
app.use("/api/pop/maintenance", maintenanceRoutes);
app.use("/api/pop/tasks", taskRoutes);
app.use("/api/pop/reputation", reputationRoutes);
app.use("/api/pop/requests", requestRoutes);
app.use("/api/pop/borrow", borrowRoutes);
app.use("/api/pop/sharing", sharingRoutes);
app.use("/api/pop/community-reviews", communityReviewRoutes);
app.use("/api/pop/chat", popChatRoutes);

// 404 HANDLER
app.use((req, res) => {
	if (req.path.startsWith("/api")) {
		return res.status(404).json({
			success: false,
			error: "API route not found",
			path: req.path,
			method: req.method,
		});
	}
	return res.status(404).json({
		success: false,
		error: "Route not found",
	});
});

// ERROR HANDLER
app.use((err, req, res, next) => {
	console.error("❌ Error:", err.stack);
	res.status(err.status || 500).json({
		success: false,
		message: err.message || "Internal Server Error",
		...(process.env.NODE_ENV === "development" && {
			stack: err.stack,
		}),
	});
});

// START SERVER
async function startServer() {
	try {
		console.log("🔄 Starting server...");
		const connected = await checkConnection();
		if (!connected) {
			console.error("❌ Cannot connect to database. Exiting...");
			process.exit(1);
		}
		// Table creation removed.
		// Database schema is managed externally.
		server.listen(PORT, () => {
			console.log(`\n🚀 Server running on http://localhost:${PORT}`);
			console.log(`📡 WebSocket server running on ws://localhost:${PORT}`);
			console.log(
				`🔔 Notifications API: http://localhost:${PORT}/api/notifications`,
			);
			console.log(
				`🔔 POP Notifications API: http://localhost:${PORT}/api/pop/notifications`,
			);
			console.log(`💬 Chat API: http://localhost:${PORT}/api/chat`);
			console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
			// Start POP time-based borrow lifecycle processing
			startBorrowLifecycleWorker();
		});
	} catch (error) {
		console.error("❌ Failed to start server:", error.message);
		process.exit(1);
	}
}
startServer();

// GRACEFUL SHUTDOWN
const gracefulShutdown = async (signal) => {
	console.log(`\n🛑 ${signal} received. Shutting down...`);
	stopBorrowLifecycleWorker();
	server.close(() => {
		console.log("✅ HTTP/WebSocket server closed.");
		process.exit(0);
	});
	// Safety timeout
	setTimeout(() => {
		console.error("⚠️ Forced shutdown.");
		process.exit(1);
	}, 10000);
};
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// EXPORTS
export { io };
export default app;
