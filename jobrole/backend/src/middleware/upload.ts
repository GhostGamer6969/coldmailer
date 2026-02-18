import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const UPLOAD_DIR = path.resolve(__dirname, "../../uploads");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const ALLOWED_MIMES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

const maxSizeMB = parseInt(process.env.MAX_FILE_SIZE_MB || "10", 10);

export const upload = multer({
  storage,
  limits: {
    fileSize: maxSizeMB * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Only PDF and DOCX are accepted.`));
    }
  },
});
