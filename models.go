package main

// User 用户信息
type User struct {
	ID      string `json:"id"`      // 用户ID（唯一标识）
	Name    string `json:"name"`    // 用户姓名
	Photo   string `json:"photo"`   // 照片路径（base64或文件路径）
	Won     bool   `json:"won"`     // 是否已中奖
	PrizeID string `json:"prizeId"` // 中奖的奖项ID（如果中奖）
	WonTime string `json:"wonTime"` // 中奖时间
}

// Prize 奖项信息
type Prize struct {
	ID          string `json:"id"`          // 奖项ID
	Name        string `json:"name"`        // 奖项名称
	Description string `json:"description"` // 奖项描述
	Count       int    `json:"count"`       // 中奖数量
	DrawnCount  int    `json:"drawnCount"`  // 已抽取数量
	Level       int    `json:"level"`       // 奖项等级（数字越小等级越高）
}

// LotteryData 抽奖数据
type LotteryData struct {
	Users  []User  `json:"users"`  // 所有用户
	Prizes []Prize `json:"prizes"` // 所有奖项
}

// AddUserRequest 添加用户请求
type AddUserRequest struct {
	Name  string `json:"name"`
	Photo string `json:"photo"` // base64编码的图片
}

// AddPrizeRequest 添加奖项请求
type AddPrizeRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Count       int    `json:"count"`
	Level       int    `json:"level"`
}

// DrawResult 抽奖结果
type DrawResult struct {
	UserID    string `json:"userId"`
	UserName  string `json:"userName"`
	UserPhoto string `json:"userPhoto"`
	PrizeID   string `json:"prizeId"`
	PrizeName string `json:"prizeName"`
	Success   bool   `json:"success"`
	Message   string `json:"message"`
}
