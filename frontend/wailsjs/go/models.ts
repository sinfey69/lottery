export namespace main {
	
	export class DrawResult {
	    userId: string;
	    userName: string;
	    userPhoto: string;
	    prizeId: string;
	    prizeName: string;
	    success: boolean;
	    message: string;
	
	    static createFrom(source: any = {}) {
	        return new DrawResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.userId = source["userId"];
	        this.userName = source["userName"];
	        this.userPhoto = source["userPhoto"];
	        this.prizeId = source["prizeId"];
	        this.prizeName = source["prizeName"];
	        this.success = source["success"];
	        this.message = source["message"];
	    }
	}
	export class Prize {
	    id: string;
	    name: string;
	    description: string;
	    count: number;
	    drawnCount: number;
	    level: number;
	
	    static createFrom(source: any = {}) {
	        return new Prize(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.description = source["description"];
	        this.count = source["count"];
	        this.drawnCount = source["drawnCount"];
	        this.level = source["level"];
	    }
	}
	export class User {
	    id: string;
	    name: string;
	    photo: string;
	    won: boolean;
	    prizeId: string;
	    wonTime: string;
	
	    static createFrom(source: any = {}) {
	        return new User(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.photo = source["photo"];
	        this.won = source["won"];
	        this.prizeId = source["prizeId"];
	        this.wonTime = source["wonTime"];
	    }
	}

}

