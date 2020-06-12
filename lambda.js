"use strict";
const app = require("./dist/app");

module.exports.handler = (event, context, callback) => {
	console.log("Executing Reboot Lambda POC");
	app.execute(event, context, callback);
};

const test = () => {
	const event = {
		Records: [
			{
				Sns: {
					Type: "Notification",
					MessageId: "b09bce21-d426-5041-848a-99659b87e25e",
					TopicArn: "arn:aws:sns:us-east-1:326935872127:here-livemap-e2e-feature",
					Subject: null,
					Message:
						"H4sIAAAAAAAAALVVbY/aOBD+K1G+HkGOE5KAVOlYXrr0lpdC2LasVsgkDuQ2ibO2A2W3+99vnAS6bz31PhwSsuPxzDzz4nkedSE5Jeko1Du6R1uBg4OW0Q5Mathtu2UQhyCjHZpO6NqU4hbSG7rISUDhunmRLcS2556O/GOujvuDK78LZxElsuCn01milBp6sCPZlgq9c/Oos5xyImOWgbw3H3T9wU81vfOoxwrUVbynY5L7VEhAY0Vui0QGRhgbthXZxoZiy9iEnrlBnuk5tmUM/QCZOMSWAiYr78PaaEPPufIqYwXh8RcYY8F6rMgkP/ZYqAQXcxVQQCTdMl6q3uguQgb8kYFM5Oq3AJwxwHsDu4ykdYRqB/qapin8sJQuYNUmIFEr2E0gIwXZ0trZbDrXKxs1rOlwOOqNulf6E9gOWCZJIEXlKWFBmcDKW5qTUVhLSBhyKt4LksWZ7NbShr5jhaCTIt1QXmtuijgJ42w7qaOAI84KSUtFZY8zEpb94rasNvZM21J5PUnlMzcqaYxxsAapU7agZk2MbcttGBg322671UC3T/ADJ39mohOwtLOjnHZS2KRUEmVxR8RuRo4JuAXDci8eusIcj6w/3HGXftv06eqy++ED+Eohgck1BFK1lNl0mp6xmHRni8upr7qUFTygJfTedLw2kfqZa4zMtomwioIdMspBXOTpD5Kx7JhCegzIEAfhFtKQ18K0yA2S52X1hFzmIQQYXhxrqZt9tnPSTfqrkF59u9tfHnyV6+J0bSl+7eV8qZu/dQbdK2mgKj5MyLauTgAPGDT8BVyHhwEd2TKw7ZuoY+FOy2t6rrV6CfTfrz69UwtIbFWM6v2Wz0PFYIL7pBCw/y8ThIaxZLxqWhV2qft+NmDpvXh35nQ8+Xu/u0SfMFvdj+7Hn5dDuIjv6eGvrysLffy+/ej39iLKVdDM/HT8urufrpbH4u4a96Pxg63fPjVe+f2Z4f/JIZQpLOizvDsGct+UiNN9TA+jLGJVZXOodiZjklyTpIBXhVQHxIBMHmuM0HG4Bs2yKObpeRxUs+LF0eOLkzL46WK8Huv11ZBmAb2ie5qAqyb2YHyKErDZNkxkYMs32x3kdWy76bWdCnAEHQJapUcV5T5myXMMnOYk5ucPFd9CAnawu5zMlhdXo8XloH8mhpOsooP+m178fnxQXVgUJTcEkYvDwHSMEGHHsFuIAh9sXAPhTRhhEmKHlJxTPZAuzCez1UaW6ViuByk/P7Z3JO+QnKxenJ4AI6UkFzDg6LYiMJhuEkZmxGFmHhi/U3ywjrO8kDMm4ori0OtY1CiH8pZTCZQ7td3OK7vlUIUVUsOlHytCOWF1PNt2GqW0rObv8KNe3e9TEfA4r9n3y45mmiB7gKERLS9J6hDLHXwoItKiIkk0FmmHXQzKKjWioY2XM00AfyShVlX5uVgjWagJKrXu0p+uB5P+dL4YaIxX3/PB9WjwZd0fDAfzuSoz5GZLGUx81dG/SSJthM80gmBfMsnt0z/whr1s0wgAAA==",
					Timestamp: "2020-05-24T10:33:05.801Z",
					SignatureVersion: "1",
					Signature:
						"s3GOJMr2FIxxqucFKUM9mzo/ml3EKxTCHNKqIfWwR/AyTCdGImQCocDoByA2wij5znZCm53TUm6QJEt6vIYG394ZgAfKM8/oIpcPHk2hUy6R4W6zNaSkarplX+GZ7dzs454mvHxVrMoaKxRkiWW417nuhzgjap6lg6TKA0GOubNE6gqw0kmO5TQNqGLVu3rXLChyvn0badJCFC3aWapalW0KUuvMeQsjVTxYsd5nNYOWKmFDFKTn9RktH6nrH188junXMzjvtWLfkp1/mY+PiAGzJgWXzRIWrL69F9LCA2O7Pty10RQUX9QRJy8vBU3o7xnox1Oio/k5ayMmbtaFeg==",
					SigningCertUrl:
						"https://sns.us-east-1.amazonaws.com/SimpleNotificationService-a86cb10b4e1f29c941702d737128f7b6.pem",
					UnsubscribeUrl:
						"https://sns.us-east-1.amazonaws.com/?Action=Unsubscribe&SubscriptionArn=arn:aws:sns:us-east-1:326935872127:here-livemap-e2e-feature:287aae59-a68d-4bfd-8163-7c2b4fd6486a",
					MessageAttributes: {
						country: { Type: "String", Value: "BRA" },
						spaceType: { Type: "String", Value: "DELTA" },
						featureType: { Type: "String", Value: "Place" },
						reviewState: { Type: "String", Value: "UNPUBLISHED" },
						user: { Type: "String", Value: "upm|mup-app" },
						operation: { Type: "String", Value: "CREATE" },
						space: { Type: "String", Value: "1BnSsgC7" },
					},
				},
			},
		],
	};

	app.execute(event, {}, () => {
		console.log("I got called back ");
	});
};
test();
