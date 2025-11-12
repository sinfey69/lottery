package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

// NewApp creates a new App application struct
func NewApp() *App {
	app := &App{}

	// 初始化日志
	app.initLogger()

	// 初始化数据库
	if err := app.initDB(); err != nil {
		app.logError("初始化数据库失败: %v", err)
		// 即使失败也返回app，让程序可以运行
	}

	return app
}

// initLogger 初始化日志
func (a *App) initLogger() {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		homeDir = "."
	}
	logDir := filepath.Join(homeDir, ".lottery")
	os.MkdirAll(logDir, 0755)
	logFile := filepath.Join(logDir, "lottery.log")

	file, err := os.OpenFile(logFile, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		log.SetOutput(os.Stdout)
		log.Printf("无法打开日志文件，使用标准输出: %v", err)
		return
	}

	log.SetOutput(file)
	log.SetFlags(log.LstdFlags | log.Lmicroseconds)
}

// logSQL 记录SQL操作
func (a *App) logSQL(operation string, sql string, args ...interface{}) {
	log.Printf("[SQL] %s | SQL: %s | Args: %v", operation, sql, args)
	fmt.Printf("[SQL] %s | SQL: %s | Args: %v\n", operation, sql, args)
}

// logError 记录错误
func (a *App) logError(format string, args ...interface{}) {
	msg := fmt.Sprintf(format, args...)
	log.Printf("[ERROR] %s", msg)
	fmt.Printf("[ERROR] %s\n", msg)
}

// logInfo 记录信息
func (a *App) logInfo(format string, args ...interface{}) {
	msg := fmt.Sprintf(format, args...)
	log.Printf("[INFO] %s", msg)
	fmt.Printf("[INFO] %s\n", msg)
}

// initDB 初始化数据库
func (a *App) initDB() error {
	// 获取数据库文件路径
	homeDir, err := os.UserHomeDir()
	if err != nil {
		homeDir = "."
	}
	dataDir := filepath.Join(homeDir, ".lottery")
	os.MkdirAll(dataDir, 0755)
	dbFile := filepath.Join(dataDir, "lottery.db")

	a.logInfo("初始化数据库，文件路径: %s", dbFile)

	// 打开数据库连接
	db, err := sql.Open("sqlite", dbFile)
	if err != nil {
		a.logError("打开数据库失败: %v", err)
		return fmt.Errorf("打开数据库失败: %v", err)
	}
	a.db = db

	// 测试连接
	if err := a.db.Ping(); err != nil {
		a.logError("数据库连接测试失败: %v", err)
		return fmt.Errorf("数据库连接测试失败: %v", err)
	}
	a.logInfo("数据库连接成功")

	// 创建表
	if err := a.createTables(); err != nil {
		a.logError("创建表失败: %v", err)
		return fmt.Errorf("创建表失败: %v", err)
	}

	a.logInfo("数据库初始化完成")
	return nil
}

// createTables 创建数据库表
func (a *App) createTables() error {
	// 创建用户表
	createUsersTable := `
	CREATE TABLE IF NOT EXISTS users (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		photo TEXT,
		won INTEGER DEFAULT 0,
		prize_id TEXT,
		won_time TEXT
	);`

	// 创建奖项表
	createPrizesTable := `
	CREATE TABLE IF NOT EXISTS prizes (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		description TEXT,
		count INTEGER NOT NULL,
		drawn_count INTEGER DEFAULT 0,
		level INTEGER NOT NULL
	);`

	a.logSQL("创建用户表", createUsersTable)
	if _, err := a.db.Exec(createUsersTable); err != nil {
		a.logError("创建用户表失败: %v", err)
		return fmt.Errorf("创建用户表失败: %v", err)
	}
	a.logInfo("用户表创建成功")

	a.logSQL("创建奖项表", createPrizesTable)
	if _, err := a.db.Exec(createPrizesTable); err != nil {
		a.logError("创建奖项表失败: %v", err)
		return fmt.Errorf("创建奖项表失败: %v", err)
	}
	a.logInfo("奖项表创建成功")

	return nil
}

// closeDB 关闭数据库连接
func (a *App) closeDB() error {
	if a.db != nil {
		return a.db.Close()
	}
	return nil
}
