package dto

type RequestUserByParam struct {
	ID int `uri:"id" binding:"gt=0"`
}

type RequestSearchQuery struct {
	Name string `form:"name"`
	MaSo string `form:"maso"`
	Page int    `form:"page"`
	Size int    `form:"size"`
}
