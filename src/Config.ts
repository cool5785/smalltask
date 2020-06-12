import _ from "lodash";

var env = process.env.env || "dev";

export interface pgConfig {
	host: string;
	database: string;
	user: string;
	password: string;
	port?: number;
}

export interface DBConfig {
	violationDB: pgConfig;
	mapTaskDB: pgConfig;
}
export interface SpaceConfig {
	base: string;
	violation: string;
}

export interface ServiceConfig extends DBConfig {
	access_token: {
		base: string;
		violation: string;
		maptask: string;
	};
	"spaces.maptask": string;
	"spaces.road": SpaceConfig;
	"spaces.place": SpaceConfig;
}

var CONFIG_VALUES: { config: ServiceConfig } = _.extend(require(`./config/${env}`));

export class Config {
	static get = (key: keyof ServiceConfig) => {
		return CONFIG_VALUES.config[key];
	};
	static all = (): ServiceConfig => {
		return CONFIG_VALUES.config;
	};

	static env = () => {
		return env;
	};
}
