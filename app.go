package main

import (
	"database/sql"
	"errors"
	"fmt"
	"math/rand"
	"strings"
	"time"

	"github.com/google/uuid"
)

// App struct
type App struct {
	db *sql.DB
}

// GetUsers 获取所有用户
func (a *App) GetUsers() []User {
	if a.db == nil {
		a.logError("GetUsers: 数据库未初始化")
		return []User{}
	}

	querySQL := "SELECT id, name, photo, won, prize_id, won_time FROM users"
	a.logSQL("查询所有用户", querySQL)

	rows, err := a.db.Query(querySQL)
	if err != nil {
		a.logError("查询用户失败: %v", err)
		return []User{}
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var user User
		var won int
		err := rows.Scan(&user.ID, &user.Name, &user.Photo, &won, &user.PrizeID, &user.WonTime)
		if err != nil {
			continue
		}
		user.Won = won == 1
		users = append(users, user)
	}

	return users
}

// GetPrizes 获取所有奖项
func (a *App) GetPrizes() []Prize {
	if a.db == nil {
		a.logError("GetPrizes: 数据库未初始化")
		return []Prize{}
	}

	querySQL := "SELECT id, name, description, count, drawn_count, level FROM prizes"
	a.logSQL("查询所有奖项", querySQL)

	rows, err := a.db.Query(querySQL)
	if err != nil {
		a.logError("查询奖项失败: %v", err)
		return []Prize{}
	}
	defer rows.Close()

	var prizes []Prize
	for rows.Next() {
		var prize Prize
		err := rows.Scan(&prize.ID, &prize.Name, &prize.Description, &prize.Count, &prize.DrawnCount, &prize.Level)
		if err != nil {
			continue
		}
		prizes = append(prizes, prize)
	}

	return prizes
}

// AddUser 添加用户
func (a *App) AddUser(name string, photo string) (User, error) {
	a.logInfo("AddUser 被调用，name: %s", name)

	if a.db == nil {
		err := fmt.Errorf("数据库未初始化")
		a.logError("AddUser 失败: %v", err)
		return User{}, err
	}

	user := User{
		ID:    uuid.New().String(),
		Name:  name,
		Photo: photo,
		Won:   false,
	}

	won := 0
	insertSQL := "INSERT INTO users (id, name, photo, won, prize_id, won_time) VALUES (?, ?, ?, ?, ?, ?)"
	photoLen := len(user.Photo)
	a.logSQL("添加用户", insertSQL, user.ID, user.Name, fmt.Sprintf("photo(%d bytes)", photoLen), won, "", "")

	_, err := a.db.Exec(insertSQL, user.ID, user.Name, user.Photo, won, "", "")
	if err != nil {
		a.logError("插入用户失败: %v", err)
		return user, fmt.Errorf("插入用户失败: %v", err)
	}

	a.logInfo("AddUser 成功，用户ID: %s", user.ID)
	return user, nil
}

// DeleteUser 删除用户
func (a *App) DeleteUser(userID string) error {
	a.logInfo("DeleteUser 被调用，userID: %s", userID)

	if a.db == nil {
		err := fmt.Errorf("数据库未初始化")
		a.logError("DeleteUser 失败: %v", err)
		return err
	}

	if userID == "" {
		err := fmt.Errorf("用户ID不能为空")
		a.logError("DeleteUser 失败: %v", err)
		return err
	}

	// 先检查用户是否存在
	checkSQL := "SELECT COUNT(*) FROM users WHERE id = ?"
	a.logSQL("检查用户是否存在", checkSQL, userID)

	var count int
	err := a.db.QueryRow(checkSQL, userID).Scan(&count)
	if err != nil {
		a.logError("查询用户失败: %v", err)
		return fmt.Errorf("查询用户失败: %v", err)
	}

	a.logInfo("用户存在检查结果: count = %d", count)
	if count == 0 {
		err := fmt.Errorf("用户不存在: %s", userID)
		a.logError("DeleteUser 失败: %v", err)
		return err
	}

	// 执行删除
	deleteSQL := "DELETE FROM users WHERE id = ?"
	a.logSQL("删除用户", deleteSQL, userID)

	result, err := a.db.Exec(deleteSQL, userID)
	if err != nil {
		a.logError("执行删除SQL失败: %v", err)
		return fmt.Errorf("删除用户失败: %v", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		a.logError("获取删除结果失败: %v", err)
		return fmt.Errorf("获取删除结果失败: %v", err)
	}

	a.logInfo("删除操作影响行数: %d", rowsAffected)
	if rowsAffected == 0 {
		err := fmt.Errorf("删除失败，未影响任何行: %s", userID)
		a.logError("DeleteUser 失败: %v", err)
		return err
	}

	a.logInfo("DeleteUser 成功，用户ID: %s", userID)
	return nil
}

// AddPrize 添加奖项
func (a *App) AddPrize(name string, description string, count int, level int) (Prize, error) {
	if a.db == nil {
		return Prize{}, fmt.Errorf("数据库未初始化")
	}

	prize := Prize{
		ID:          uuid.New().String(),
		Name:        name,
		Description: description,
		Count:       count,
		DrawnCount:  0,
		Level:       level,
	}

	_, err := a.db.Exec(
		"INSERT INTO prizes (id, name, description, count, drawn_count, level) VALUES (?, ?, ?, ?, ?, ?)",
		prize.ID, prize.Name, prize.Description, prize.Count, prize.DrawnCount, prize.Level,
	)
	if err != nil {
		return prize, fmt.Errorf("插入奖项失败: %v", err)
	}

	return prize, nil
}

// DeletePrize 删除奖项
func (a *App) DeletePrize(prizeID string) error {
	a.logInfo("DeletePrize 被调用，prizeID: %s", prizeID)

	if a.db == nil {
		err := fmt.Errorf("数据库未初始化")
		a.logError("DeletePrize 失败: %v", err)
		return err
	}

	if prizeID == "" {
		err := fmt.Errorf("奖项ID不能为空")
		a.logError("DeletePrize 失败: %v", err)
		return err
	}

	// 先检查奖项是否存在
	checkSQL := "SELECT COUNT(*) FROM prizes WHERE id = ?"
	a.logSQL("检查奖项是否存在", checkSQL, prizeID)

	var count int
	err := a.db.QueryRow(checkSQL, prizeID).Scan(&count)
	if err != nil {
		a.logError("查询奖项失败: %v", err)
		return fmt.Errorf("查询奖项失败: %v", err)
	}

	a.logInfo("奖项存在检查结果: count = %d", count)
	if count == 0 {
		err := fmt.Errorf("奖项不存在: %s", prizeID)
		a.logError("DeletePrize 失败: %v", err)
		return err
	}

	// 执行删除
	deleteSQL := "DELETE FROM prizes WHERE id = ?"
	a.logSQL("删除奖项", deleteSQL, prizeID)

	result, err := a.db.Exec(deleteSQL, prizeID)
	if err != nil {
		a.logError("执行删除SQL失败: %v", err)
		return fmt.Errorf("删除奖项失败: %v", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		a.logError("获取删除结果失败: %v", err)
		return fmt.Errorf("获取删除结果失败: %v", err)
	}

	a.logInfo("删除操作影响行数: %d", rowsAffected)
	if rowsAffected == 0 {
		err := fmt.Errorf("删除失败，未影响任何行: %s", prizeID)
		a.logError("DeletePrize 失败: %v", err)
		return err
	}

	a.logInfo("DeletePrize 成功，奖项ID: %s", prizeID)
	return nil
}

// UpdatePrize 更新奖项
func (a *App) UpdatePrize(prizeID string, name string, description string, count int, level int) error {
	if a.db == nil {
		return fmt.Errorf("数据库未初始化")
	}

	result, err := a.db.Exec(
		"UPDATE prizes SET name = ?, description = ?, count = ?, level = ? WHERE id = ?",
		name, description, count, level, prizeID,
	)
	if err != nil {
		return fmt.Errorf("更新奖项失败: %v", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("获取更新结果失败: %v", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("奖项不存在")
	}

	return nil
}

// GetAvailableUsers 获取可参与抽奖的用户（未中奖的用户）
func (a *App) GetAvailableUsers() []User {
	if a.db == nil {
		return []User{}
	}

	rows, err := a.db.Query("SELECT id, name, photo, won, prize_id, won_time FROM users WHERE won = 0")
	if err != nil {
		fmt.Printf("查询可参与用户失败: %v\n", err)
		return []User{}
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var user User
		var won int
		err := rows.Scan(&user.ID, &user.Name, &user.Photo, &won, &user.PrizeID, &user.WonTime)
		if err != nil {
			continue
		}
		user.Won = won == 1
		users = append(users, user)
	}

	return users
}

// DrawLottery 抽奖
func (a *App) DrawLottery(prizeID string) (DrawResult, error) {
	a.logInfo("DrawLottery 被调用，prizeID: %s", prizeID)

	if a.db == nil {
		err := fmt.Errorf("数据库未初始化")
		a.logError("DrawLottery 失败: %v", err)
		return DrawResult{Success: false, Message: "数据库未初始化"}, err
	}

	// 查找奖项
	querySQL := "SELECT id, name, description, count, drawn_count, level FROM prizes WHERE id = ?"
	a.logSQL("查询奖项", querySQL, prizeID)

	var prize Prize
	err := a.db.QueryRow(querySQL, prizeID).
		Scan(&prize.ID, &prize.Name, &prize.Description, &prize.Count, &prize.DrawnCount, &prize.Level)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			a.logError("奖项不存在: %s", prizeID)
			return DrawResult{Success: false, Message: "奖项不存在"}, fmt.Errorf("奖项不存在")
		}
		a.logError("查询奖项失败: %v", err)
		return DrawResult{Success: false, Message: "查询奖项失败"}, err
	}

	a.logInfo("查询到奖项: %s, 已抽取: %d/%d", prize.Name, prize.DrawnCount, prize.Count)

	// 检查是否还有剩余名额
	if prize.DrawnCount >= prize.Count {
		a.logError("奖项已抽完: %s", prizeID)
		return DrawResult{Success: false, Message: "该奖项已抽完"}, fmt.Errorf("该奖项已抽完")
	}

	// 获取可参与抽奖的用户
	availableUsers := a.GetAvailableUsers()
	a.logInfo("可参与抽奖的用户数: %d", len(availableUsers))
	if len(availableUsers) == 0 {
		a.logError("没有可参与抽奖的用户")
		return DrawResult{Success: false, Message: "没有可参与抽奖的用户"}, fmt.Errorf("没有可参与抽奖的用户")
	}

	// 随机选择一个用户（公平随机）
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	selectedIndex := r.Intn(len(availableUsers))
	selectedUser := availableUsers[selectedIndex]
	a.logInfo("随机选择用户: %s (索引: %d)", selectedUser.Name, selectedIndex)

	// 更新用户状态
	wonTime := time.Now().Format("2006-01-02 15:04:05")
	updateUserSQL := "UPDATE users SET won = 1, prize_id = ?, won_time = ? WHERE id = ?"
	a.logSQL("更新用户中奖状态", updateUserSQL, prizeID, wonTime, selectedUser.ID)

	_, err = a.db.Exec(updateUserSQL, prizeID, wonTime, selectedUser.ID)
	if err != nil {
		a.logError("更新用户状态失败: %v", err)
		return DrawResult{Success: false, Message: "更新用户状态失败"}, err
	}

	// 更新奖项已抽取数量
	updatePrizeSQL := "UPDATE prizes SET drawn_count = drawn_count + 1 WHERE id = ?"
	a.logSQL("更新奖项抽取数量", updatePrizeSQL, prizeID)

	_, err = a.db.Exec(updatePrizeSQL, prizeID)
	if err != nil {
		a.logError("更新奖项数量失败: %v", err)
		return DrawResult{Success: false, Message: "更新奖项数量失败"}, err
	}

	a.logInfo("DrawLottery 成功，用户: %s, 奖项: %s", selectedUser.Name, prize.Name)

	return DrawResult{
		Success:   true,
		UserID:    selectedUser.ID,
		UserName:  selectedUser.Name,
		UserPhoto: selectedUser.Photo,
		PrizeID:   prizeID,
		PrizeName: prize.Name,
		Message:   fmt.Sprintf("恭喜 %s 获得 %s！", selectedUser.Name, prize.Name),
	}, nil
}

// ResetLottery 重置抽奖（清空所有中奖记录）
func (a *App) ResetLottery() error {
	a.logInfo("ResetLottery 被调用")

	if a.db == nil {
		err := fmt.Errorf("数据库未初始化")
		a.logError("ResetLottery 失败: %v", err)
		return err
	}

	// 重置所有用户的中奖状态
	resetUsersSQL := "UPDATE users SET won = 0, prize_id = '', won_time = ''"
	a.logSQL("重置所有用户中奖状态", resetUsersSQL)

	_, err := a.db.Exec(resetUsersSQL)
	if err != nil {
		a.logError("重置用户状态失败: %v", err)
		return fmt.Errorf("重置用户状态失败: %v", err)
	}

	// 重置所有奖项的已抽取数量
	resetPrizesSQL := "UPDATE prizes SET drawn_count = 0"
	a.logSQL("重置所有奖项抽取数量", resetPrizesSQL)

	_, err = a.db.Exec(resetPrizesSQL)
	if err != nil {
		a.logError("重置奖项数量失败: %v", err)
		return fmt.Errorf("重置奖项数量失败: %v", err)
	}

	a.logInfo("ResetLottery 成功")
	return nil
}

// DeleteAllUsers 删除所有用户
func (a *App) DeleteAllUsers() error {
	a.logInfo("DeleteAllUsers 被调用")

	if a.db == nil {
		err := fmt.Errorf("数据库未初始化")
		a.logError("DeleteAllUsers 失败: %v", err)
		return err
	}

	// 执行删除所有用户
	deleteSQL := "DELETE FROM users"
	a.logSQL("删除所有用户", deleteSQL)

	result, err := a.db.Exec(deleteSQL)
	if err != nil {
		a.logError("执行删除SQL失败: %v", err)
		return fmt.Errorf("删除所有用户失败: %v", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		a.logError("获取删除结果失败: %v", err)
		return fmt.Errorf("获取删除结果失败: %v", err)
	}

	a.logInfo("删除所有用户成功，影响行数: %d", rowsAffected)
	return nil
}

// GetStatistics 获取统计信息
func (a *App) GetStatistics() map[string]interface{} {
	if a.db == nil {
		return map[string]interface{}{
			"totalUsers":     0,
			"wonUsers":       0,
			"availableUsers": 0,
			"prizes":         []Prize{},
		}
	}

	var totalUsers, wonUsers, availableUsers int

	// 统计总用户数
	a.db.QueryRow("SELECT COUNT(*) FROM users").Scan(&totalUsers)

	// 统计已中奖用户数
	a.db.QueryRow("SELECT COUNT(*) FROM users WHERE won = 1").Scan(&wonUsers)

	// 统计可参与用户数
	a.db.QueryRow("SELECT COUNT(*) FROM users WHERE won = 0").Scan(&availableUsers)

	// 获取所有奖项
	prizes := a.GetPrizes()

	return map[string]interface{}{
		"totalUsers":     totalUsers,
		"wonUsers":       wonUsers,
		"availableUsers": availableUsers,
		"prizes":         prizes,
	}
}

// GetWonUsers 获取所有中奖用户列表
func (a *App) GetWonUsers() []map[string]interface{} {
	if a.db == nil {
		return []map[string]interface{}{}
	}

	rows, err := a.db.Query(`
		SELECT u.id, u.name, u.photo, u.prize_id, u.won_time, p.name as prize_name
		FROM users u
		LEFT JOIN prizes p ON u.prize_id = p.id
		WHERE u.won = 1
		ORDER BY u.won_time DESC
	`)
	if err != nil {
		fmt.Printf("查询中奖用户失败: %v\n", err)
		return []map[string]interface{}{}
	}
	defer rows.Close()

	var wonUsers []map[string]interface{}
	for rows.Next() {
		var id, name, photo, prizeID, wonTime, prizeName sql.NullString
		err := rows.Scan(&id, &name, &photo, &prizeID, &wonTime, &prizeName)
		if err != nil {
			continue
		}

		wonUsers = append(wonUsers, map[string]interface{}{
			"id":        id.String,
			"name":      name.String,
			"photo":     photo.String,
			"prizeId":   prizeID.String,
			"prizeName": prizeName.String,
			"wonTime":   wonTime.String,
		})
	}

	return wonUsers
}

// ImportUsersFromCSV 从CSV导入用户（如果已存在则覆盖，不存在则新增）
func (a *App) ImportUsersFromCSV(csvData string) (int, error) {
	if a.db == nil {
		return 0, fmt.Errorf("数据库未初始化")
	}

	lines := strings.Split(csvData, "\n")
	importedCount := 0

	// 开始事务
	tx, err := a.db.Begin()
	if err != nil {
		return 0, fmt.Errorf("开始事务失败: %v", err)
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare("INSERT INTO users (id, name, photo, won, prize_id, won_time) VALUES (?, ?, ?, ?, ?, ?)")
	if err != nil {
		return 0, fmt.Errorf("准备语句失败: %v", err)
	}
	defer stmt.Close()

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		// 解析CSV行（简单处理，支持逗号分隔）
		parts := strings.Split(line, ",")
		if len(parts) == 0 {
			continue
		}

		name := strings.TrimSpace(parts[0])
		if name == "" {
			continue
		}

		photo := ""
		if len(parts) > 1 {
			photo = strings.TrimSpace(parts[1])
		}

		// 检查用户是否已存在（根据姓名）
		checkSQL := "SELECT id, won, prize_id, won_time FROM users WHERE name = ?"
		a.logSQL("检查用户是否存在", checkSQL, name)

		var existingID string
		var existingWon int
		var existingPrizeID, existingWonTime sql.NullString
		err := tx.QueryRow(checkSQL, name).Scan(&existingID, &existingWon, &existingPrizeID, &existingWonTime)

		if err == nil {
			// 用户已存在，更新（保留中奖状态，只更新姓名和照片）
			updateSQL := "UPDATE users SET name = ?, photo = ? WHERE id = ?"
			a.logSQL("更新已存在用户", updateSQL, name, len(photo), existingID)

			_, err = tx.Exec(updateSQL, name, photo, existingID)
			if err != nil {
				a.logError("更新用户失败: %v", err)
				continue
			}
			importedCount++
			a.logInfo("更新用户: %s (ID: %s)", name, existingID)
		} else if err == sql.ErrNoRows {
			// 用户不存在，新增
			userID := uuid.New().String()
			_, err = stmt.Exec(userID, name, photo, 0, "", "")
			if err != nil {
				a.logError("插入用户失败: %v", err)
				continue
			}
			importedCount++
			a.logInfo("新增用户: %s (ID: %s)", name, userID)
		} else {
			// 查询出错
			a.logError("查询用户失败: %v", err)
			continue
		}
	}

	// 提交事务
	if err := tx.Commit(); err != nil {
		return importedCount, fmt.Errorf("提交事务失败: %v", err)
	}

	return importedCount, nil
}
