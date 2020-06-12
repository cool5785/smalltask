import { ServiceConfig } from "../Config";
export const config: ServiceConfig = {
	violationDB: {
		host: "read.db.here.e2e.cmtrd.aws.in.here.com",
		database: "heredb",
		user: "heremap_maptask_violation",
		password: "jW6B+9hLhbcNGI2RII6xKnZMxjQ6J84nx4YwrENdFNA=",
		port: 5432,
	},
	mapTaskDB: {
		host: "read.db.here.e2e.cmtrd.aws.in.here.com",
		database: "heredb",
		user: "sourcing_maptask_violation",
		password: "A1/J3GX4un9swPXzd8UXxUHlLek4OSMAP70p29/6YOg",
		port: 5432,
	},
	access_token: {
		base: "AK-DOoA0pEEWWOoBSKneXjQ",
		violation: "AAaVYeyENIyqVX3eJnHl-Eo",
		maptask: "AK-DOoA0pEEWWOoBSKneXjQ",
	},
	"spaces.maptask": "39ZVK252",
	"spaces.road": {
		base: "H1SFQLdK",
		violation: "xGBJ0MJG",
	},
	"spaces.place": {
		base: "9HiJ9Bos",
		violation: "47qHNBy8",
	},
};
