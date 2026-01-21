
<?php
ob_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, Accept");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$host = '127.0.0.1';
$user = 'u738548379_store_user';
$pass = 'Tooty191198';
$db   = 'u738548379_store_db';

// Cloudinary Config
$cloudinary_cloud_name = 'deraibtt5';
$cloudinary_api_key = '213731599396377';
$cloudinary_api_secret = 'JInei9tzlu72pMgfeqo7CQNwOjM';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    // تحديث جدول الإعدادات ليشمل اسم الموقع والبانرات
    $pdo->exec("CREATE TABLE IF NOT EXISTS site_config (id INT PRIMARY KEY, siteName TEXT, logoUrl TEXT, banners TEXT, vodafoneNumber TEXT, usdtAddress TEXT, binanceId TEXT, visitors INT, downloads INT, sales INT)");
    $pdo->exec("CREATE TABLE IF NOT EXISTS categories (id VARCHAR(50) PRIMARY KEY, name TEXT)");
    $pdo->exec("CREATE TABLE IF NOT EXISTS products (id VARCHAR(50) PRIMARY KEY, name TEXT, price DECIMAL(10,2), type TEXT, fileUrl TEXT, imageUrl TEXT, audioUrl TEXT, categoryId VARCHAR(50))");
    $pdo->exec("CREATE TABLE IF NOT EXISTS orders (id VARCHAR(50) PRIMARY KEY, productId VARCHAR(50), status TEXT, paymentMethod TEXT, customerName TEXT, proofImageUrl TEXT, timestamp BIGINT, downloaded INT)");
    $pdo->exec("CREATE TABLE IF NOT EXISTS license_keys (id VARCHAR(50) PRIMARY KEY, `key` VARCHAR(100) UNIQUE, createdAt BIGINT, expiresAt BIGINT, isUsed INT, activatedAt BIGINT, deviceId VARCHAR(100) DEFAULT NULL)");
    $pdo->exec("CREATE TABLE IF NOT EXISTS user_stats (deviceId VARCHAR(100) PRIMARY KEY, trialStartedAt BIGINT DEFAULT NULL, usageCount INT DEFAULT 0, lastActive BIGINT)");

    $stmt = $pdo->query("SELECT COUNT(*) FROM site_config");
    if ($stmt->fetchColumn() == 0) {
        $pdo->exec("INSERT INTO site_config VALUES (1, 'MIDO STUDIO', '', '[]', '01102930761', '', '', 0, 0, 0)");
    }
} catch (PDOException $e) {
    echo json_encode(["error" => "DB Error: " . $e->getMessage()]);
    exit();
}

function uploadToCloudinary($fileData, $folder = 'mido_store') {
    global $cloudinary_cloud_name, $cloudinary_api_key, $cloudinary_api_secret;
    
    $timestamp = time();
    $params = [
        "folder" => $folder,
        "timestamp" => $timestamp
    ];
    
    ksort($params);
    $sign_string = "";
    foreach($params as $key => $value) {
        $sign_string .= "$key=$value&";
    }
    $sign_string = rtrim($sign_string, "&") . $cloudinary_api_secret;
    $signature = sha1($sign_string);
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://api.cloudinary.com/v1_1/$cloudinary_cloud_name/auto/upload");
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, [
        "file" => $fileData,
        "api_key" => $cloudinary_api_key,
        "timestamp" => $timestamp,
        "signature" => $signature,
        "folder" => $folder
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($ch);
    curl_close($ch);
    
    return json_decode($response, true);
}

$action = $_GET['action'] ?? '';
$input = file_get_contents("php://input");
$data = json_decode($input, true);

ob_clean();

switch ($action) {
    case 'getConfig':
        $config = $pdo->query("SELECT * FROM site_config WHERE id=1")->fetch();
        if ($config) {
            $config['banners'] = json_decode($config['banners'] ?? '[]', true);
        }
        echo json_encode($config);
        break;

    case 'updateConfig':
        $bannersJson = json_encode($data['banners'] ?? []);
        $stmt = $pdo->prepare("UPDATE site_config SET siteName=?, logoUrl=?, banners=?, vodafoneNumber=?, usdtAddress=?, binanceId=? WHERE id=1");
        $stmt->execute([$data['siteName'], $data['logoUrl'], $bannersJson, $data['vodafoneNumber'], $data['usdtAddress'], $data['binanceId']]);
        echo json_encode(["success" => true]);
        break;

    case 'getUserStats':
        $deviceId = $_GET['deviceId'] ?? '';
        $stmt = $pdo->prepare("SELECT * FROM user_stats WHERE deviceId = ?");
        $stmt->execute([$deviceId]);
        $res = $stmt->fetch();
        if (!$res) {
            $stmt = $pdo->prepare("INSERT INTO user_stats (deviceId, lastActive) VALUES (?, ?)");
            $stmt->execute([$deviceId, time() * 1000]);
            echo json_encode(["deviceId" => $deviceId, "trialStartedAt" => null, "usageCount" => 0]);
        } else {
            echo json_encode($res);
        }
        break;

    case 'getUsers': echo json_encode($pdo->query("SELECT * FROM user_stats ORDER BY lastActive DESC LIMIT 100")->fetchAll()); break;
    case 'getProducts': echo json_encode($pdo->query("SELECT * FROM products")->fetchAll()); break;
    case 'getCategories': echo json_encode($pdo->query("SELECT * FROM categories")->fetchAll()); break;
    case 'getOrders': echo json_encode($pdo->query("SELECT * FROM orders ORDER BY timestamp DESC")->fetchAll()); break;
    case 'getKeys': echo json_encode($pdo->query("SELECT * FROM license_keys ORDER BY createdAt DESC")->fetchAll()); break;
    case 'addKey':
        $stmt = $pdo->prepare("INSERT INTO license_keys (id, `key`, createdAt, isUsed) VALUES (?,?,?,0)");
        $stmt->execute([$data['id'], $data['key'], $data['createdAt']]);
        echo json_encode(["success" => true]);
        break;
    case 'deleteKey':
        $stmt = $pdo->prepare("DELETE FROM license_keys WHERE id=?");
        $stmt->execute([$data['id']]);
        echo json_encode(["success" => true]);
        break;
    case 'deleteProduct':
        $stmt = $pdo->prepare("DELETE FROM products WHERE id=?");
        $stmt->execute([$data['id']]);
        echo json_encode(["success" => true]);
        break;
    case 'addProduct':
        $stmt = $pdo->prepare("REPLACE INTO products (id, name, price, type, fileUrl, imageUrl, audioUrl, categoryId) VALUES (?,?,?,?,?,?,?,?)");
        $stmt->execute([$data['id'], $data['name'], $data['price'], $data['type'], $data['fileUrl'], $data['imageUrl'], $data['audioUrl'], $data['categoryId']]);
        echo json_encode(["success" => true]);
        break;
    case 'addCategory':
        $stmt = $pdo->prepare("INSERT INTO categories (id, name) VALUES (?,?)");
        $stmt->execute([$data['id'], $data['name']]);
        echo json_encode(["success" => true]);
        break;
    case 'deleteCategory':
        $stmt = $pdo->prepare("DELETE FROM categories WHERE id=?");
        $stmt->execute([$data['id']]);
        echo json_encode(["success" => true]);
        break;
    case 'approveOrder':
        $stmt = $pdo->prepare("UPDATE orders SET status='approved' WHERE id=?");
        $stmt->execute([$data['id']]);
        echo json_encode(["success" => true]);
        break;
    case 'deleteOrder':
        $stmt = $pdo->prepare("DELETE FROM orders WHERE id=?");
        $stmt->execute([$data['id']]);
        echo json_encode(["success" => true]);
        break;
    case 'markDownloaded':
        $stmt = $pdo->prepare("UPDATE orders SET downloaded=1 WHERE id=?");
        $stmt->execute([$data['id']]);
        echo json_encode(["success" => true]);
        break;
    case 'upload':
        $res = uploadToCloudinary($data['file'], $data['folder'] ?? 'mido_uploads');
        echo json_encode($res);
        break;
    default: echo json_encode(["error" => "Action invalid"]); break;
}
?>
