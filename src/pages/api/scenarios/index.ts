import { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import Scenario from "@/models/Scenario";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  const { method } = req;

  switch (method) {
    case "GET":
      try {
        const scenarios = await Scenario.find({})
          .populate("owner")
          .populate("investments")
          .populate("eventSeries")
          .populate("spendingStrategy")
          .populate("expenseWithdrawalStrategy")
          .populate("viewPermissions")
          .populate("editPermissions");
        res.status(200).json({ success: true, data: scenarios });
      } catch (error) {
        res.status(400).json({ success: false, error });
      }
      break;

    case "POST":
      try {
        const scenario = await Scenario.create(req.body);
        res.status(201).json({ success: true, data: scenario });
      } catch (error) {
        res.status(400).json({ success: false, error });
      }
      break;

    default:
      res.status(405).json({ success: false, message: "Method Not Allowed" });
      break;
  }
}
