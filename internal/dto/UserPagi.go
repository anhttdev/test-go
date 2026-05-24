package dto

type CursorPagingUser struct {
	Cusor uint `form:"cursor"`
	Limit int  `form:"limit"`
}

type PagingInfo struct {
	Limit      int  `json:"limit"`
	NextCursor uint `json:"next_cursor"`
	HasMore    bool `json:"has_more"`
}

type UserCursorResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data"`
	Paging  PagingInfo  `json:"paging"`
}
