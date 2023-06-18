#include <stdio.h>
#include <stdlib.h>
#include <errno.h>
#include <fcntl.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <netinet/in.h>
#include <netinet/tcp.h>
#include <netdb.h>
#include <fcntl.h>
#include <signal.h>
#include <unistd.h>
#include <string>
#include <fstream>
#include <iostream>
#include <sstream>
#include <unistd.h>

#include <openssl/ssl.h>
#include <openssl/err.h>
#include <openssl/sha.h>

#include <sqlite3.h>
#include <nlohmann/json.hpp>

#include <ctime>
#include <random>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <chrono>

extern BIO *bio_err;
BIO *bio_err=0;

#define PEM_FILE "server.pem"
#define KEY_FILE "server.key"


void daemonize() {
    // Создание нового сеанса
    pid_t pid = fork();
    if (pid < 0) {
        exit(EXIT_FAILURE);
    }
    if (pid > 0) {
        exit(EXIT_SUCCESS);
    }

    // Изменение файловых прав
    umask(0);

    // Создание нового SID
    pid_t sid = setsid();
    if (sid < 0) {
        exit(EXIT_FAILURE);
    }

    // Закрытие стандартных дескрипторов ввода/вывода/ошибок
    close(STDIN_FILENO);
    close(STDOUT_FILENO);
    close(STDERR_FILENO);

    // Изменение текущего рабочего каталога на /
    chdir("/");
}


void handleSIGHUP(int signal) {

}

std::string sha512(const std::string& password) {
    unsigned char digest[SHA512_DIGEST_LENGTH];
    EVP_MD_CTX* mdctx;
    const EVP_MD* md;
    md = EVP_sha512();
    mdctx = EVP_MD_CTX_new();
    EVP_DigestInit_ex(mdctx, md, NULL);
    EVP_DigestUpdate(mdctx, password.c_str(), password.length());
    EVP_DigestFinal_ex(mdctx, digest, NULL);
    EVP_MD_CTX_free(mdctx);

    std::stringstream ss;
    for (int i = 0; i < SHA512_DIGEST_LENGTH; ++i) {
        ss << std::hex << std::setw(2) << std::setfill('0') << (int)digest[i];
    }
    return ss.str();
}

std::string GetParameterValue(const std::string& key, int argc, char* argv[]) {
    for (int i = 1; i < argc; ++i) {
        std::string argument = argv[i];
        if (argument.find(key + "=") == 0) {
            return argument.substr(key.length() + 1);
        }
    }
    return "./config.ini";
}


std::map<std::string, std::string> open_ini_file(std::string cfg_path) {
    std::ifstream file(cfg_path);

    std::map<std::string, std::string> config;

    if (!file.is_open())
    {
        std::cout << "Failed to open file" << std::endl;
        exit(0);
        return (config);
    }

    std::string line;
    while (std::getline(file, line))
    {
        // Ignore comments and empty strings
        if (line.empty() || line[0] == ';' || line[0] == '#')
            continue;
        // DB string on key and value
        auto pos = line.find('=');
        if (pos != std::string::npos)
        {
            std::string key = line.substr(0, pos);
            std::string value = line.substr(pos + 1);

            config[key] = value;
        }
    }

    file.close();

    return(config);
}

// Request parser function
std::map<std::string, std::string> parseQueryString(const std::string& queryString) {
    std::map<std::string, std::string> params;
    int pos = queryString.find(" ");
    std::string q_str = queryString.substr(0, pos);
    std::stringstream ss(q_str);
    std::string item;

    // Get params
    while (std::getline(ss, item, '&')) {
        std::stringstream ss2(item);
        std::string key, value;
        if (std::getline(ss2, key, '=') && std::getline(ss2, value)) {
            params[key] = value;
        }
    }

    return params;
}

std::string get_token()
{
    const std::string alphanum = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    std::mt19937 rng(std::random_device{}());
    std::uniform_int_distribution<> dist(0, alphanum.size() - 1);
    std::string token;
    for (int i = 0; i < 50; i++)
        token += alphanum[dist(rng)];
    return token;
}

sqlite3* db = 0;

using Record = std::vector<std::string>;
using Records = std::vector<Record>;

int select_callback(void* p_data, int num_fields, char** p_fields, char** p_col_names)
{
    Records* records = static_cast<Records*>(p_data);
    try {
        records->emplace_back(p_fields, p_fields + num_fields);
    }
    catch (...) {
        // abort select on failure, don't let exception propogate thru sqlite3 call-stack
        return 1;
    }
    return 0;
}

static int callback(void* data, int argc, char** argv, char** azColName) {
    int i;
    fprintf(stderr, "%s: ", (const char*)data);

    for (i = 0; i < argc; i++) {
        printf("%s = %s\n", azColName[i], argv[i] ? argv[i] : "NULL");
    }

    printf("\n");
    return 0;
}

Records select_stmt(const char* stmt)
{
    Records records;
    char* errmsg;
    int ret = sqlite3_exec(db, stmt, select_callback, &records, &errmsg);
    if (ret != SQLITE_OK) {
        std::cerr << "Error in select statement " << stmt << "[" << errmsg << "]\n";
    }
    else {
        std::cerr << records.size() << " records returned.\n";
    }

    return records;
}

void sql_stmt(const char* stmt)
{
    char* errmsg;
    int ret = sqlite3_exec(db, stmt, 0, 0, &errmsg);
    if (ret != SQLITE_OK) {
        std::cerr << "Error in select statement " << stmt << "[" << errmsg << "]\n";
    }
}

const char* SQL = "CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT, login VARCHAR(255) NOT NULL, password VARCHAR(255) NOT NULL, status INT DEFAULT 3, session_token VARCHAR(255) DEFAULT '0', session_time TEXT DEFAULT '0');";

bool check_session(Record record, std::string TOKEN_LIFETIME, char* err_db, std::string DB){
  std::time_t t = std::time(nullptr);
  const auto p1 = std::chrono::system_clock::now();
  int now = std::chrono::duration_cast<std::chrono::seconds>(p1.time_since_epoch()).count();
  std::cout << "Now: " << now << "; TOKEN_LIFETIME: " << std::stoi(TOKEN_LIFETIME) << "; Record[2]: " << record[2].c_str() << std::endl;
  if (now - atoi(record[5].c_str()) >= std::stoi(TOKEN_LIFETIME))
  {
      std::string query = ("UPDATE users SET session_token = '0', session_time = '0' WHERE login = '" + record[0] + "'").data();
      SQL = query.c_str();
      // open connection
      if (sqlite3_open(DB.c_str(), &db))
          fprintf(stderr, "Open/create DB error: %s\n", sqlite3_errmsg(db));
      // execute SQL
      else if (sqlite3_exec(db, SQL, 0, 0, &err_db))
      {
          fprintf(stderr, "SQL error: %sn", err_db);
          sqlite3_free(err_db);
      }
      // close connection
      sqlite3_close(db);

      return false;
  } else {
    return true;
  }
}

/**
 * Create simple socket
 */
int tcp_listen(int PORT)
{
    int sock;
    struct sockaddr_in sin;
    int val=1;

    if((sock=socket(AF_INET,SOCK_STREAM,0))<0)
      printf("Couldn't make socket");

    memset(&sin,0,sizeof(sin));
    sin.sin_addr.s_addr=INADDR_ANY;
    sin.sin_family=AF_INET;
    sin.sin_port=htons(PORT);
    setsockopt(sock,SOL_SOCKET,SO_REUSEADDR,&val,sizeof(val));

    if(bind(sock,(struct sockaddr *)&sin,
      sizeof(sin))<0)
      printf("Couldn't bind");
    listen(sock,5);

    return(sock);
}

/* Handle SIGPIPE signal function then can send us OS when close connection is writing*/
static void sigpipe_handle(int x){}

SSL_CTX *initialize_ctx(const char *key_file,const char *pem_file)
{
    if(!bio_err)
    {
      /* Global initialization OpenSSL algorithms */
      SSL_library_init();
      SSL_load_error_strings();

      /* An error write context */
      bio_err=BIO_new_fp(stderr,BIO_NOCLOSE);
    }

    /* Set up a SIGPIPE handler */
    signal(SIGPIPE,sigpipe_handle);


    /* Create our context*/
    SSL_CTX* ctx=SSL_CTX_new(SSLv23_method());

    /* Load our keys and certificates*/
    if(!(SSL_CTX_use_certificate_file(ctx,pem_file,SSL_FILETYPE_PEM)))
    {
        printf("Certificate load failed\n");
    }

    if(!(SSL_CTX_use_PrivateKey_file(ctx, key_file,SSL_FILETYPE_PEM)))
    {
        printf("Key load failed\n");
    }

    return ctx;
}

std::string readFile(const std::string& filename) {
    std::ifstream file(filename, std::ios::in | std::ios::binary);
    if (!file) {
        return "";
    }

    std::ostringstream contents;
    contents << file.rdbuf();
    return contents.str();
}

#define BUFSIZZ 4048
static int http_serve(SSL *ssl,int s,char* err_db, std::map<std::string, std::string> cfg)
{
    char buf[BUFSIZZ];
    int r = 0;
    int e;

    bzero(buf,BUFSIZZ-1); // clear buffer
    r=SSL_read(ssl,buf,BUFSIZZ-1); // data read
    if(r<0) // if r < 0 then raise error
    {
        e = SSL_get_error(ssl,r);
    }
    printf("[Text lenght %d, Error:%d]%s\n", r, e, buf);
    std::string request(buf);
    size_t end_pos = request.find_first_of(" ") + 1;
    std::string path = request.substr(end_pos, request.length() - 1);
    size_t pos = path.find_first_of("?");
    std::string queryString = path.substr(pos + 1);
    path = path.substr(0, pos);
    printf("%s\n", queryString.c_str());
    std::map<std::string, std::string> params = parseQueryString(queryString);
    std::stringstream response_body;
    nlohmann::json response;
    std::string resp;
    std::string filename;
    std::string fileContent;

    bool is_static = false;

    int space_pos = path.find_first_of(" ");
    if (space_pos > 0) {
      std::cout << space_pos << '\n';
      path = path.substr(0, space_pos);
    }

    std::cout << "PATH: " << path << std::endl;
    //Static roots
    if (path == "/") {
        std::cout << "CHECK" << '\n';
        filename = cfg["STATIC_ROOT"] + "html/index.html";
        is_static = true;
    } else if (path == "/login") {
        filename = cfg["STATIC_ROOT"] + "html/login/index.html";
        is_static = true;
    } else if (path == "/register") {
        filename = cfg["STATIC_ROOT"] + "html/register/index.html";
        is_static = true;
    } else if (path == "/home") {
        filename = cfg["STATIC_ROOT"] + "html/home/index.html";
        is_static = true;
    } else if (path == "/all_users") {
        filename = cfg["STATIC_ROOT"] + "html/all_users/index.html";
        is_static = true;
    } else if (path == "/experiment") {
        filename = cfg["STATIC_ROOT"] + "html/experiment/index.html";
        is_static = true;
    // Static modules
    } else if (path == "/scripts/header.js") {
      filename = cfg["STATIC_ROOT"] + "html/scripts/header.js";
      is_static = true;
    } else if (path == "/scripts/login.js") {
      filename = cfg["STATIC_ROOT"] + "html/scripts/login.js";
      is_static = true;
    } else if (path == "/scripts/config.js") {
      filename = cfg["STATIC_ROOT"] + "html/scripts/config.js";
      is_static = true;
    } else if (path == "/scripts/jquery.js") {
      filename = cfg["STATIC_ROOT"] + "html/scripts/jquery.js";
      is_static = true;
    } else if (path == "/styles/header.css") {
      filename = cfg["STATIC_ROOT"] + "html/styles/header.css";
      is_static = true;
    } else if (path == "/styles/main.css") {
      filename = cfg["STATIC_ROOT"] + "html/styles/main.css";
      is_static = true;
    } else if (path == "/scripts/register.js") {
      filename = cfg["STATIC_ROOT"] + "html/scripts/register.js";
      is_static = true;
    } else if (path == "/components/header.html") {
      filename = cfg["STATIC_ROOT"] + "html/components/header.html";
      is_static = true;
    } else if (path == "/components/header_user.html") {
      filename = cfg["STATIC_ROOT"] + "html/components/header_user.html";
      is_static = true;
    } else if (path == "/scripts/check_user.js") {
      filename = cfg["STATIC_ROOT"] + "html/scripts/check_user.js";
      is_static = true;
    } else if (path == "/scripts/logout.js") {
      filename = cfg["STATIC_ROOT"] + "html/scripts/logout.js";
      is_static = true;
    } else if (path == "/components/permissions_denied.html") {
      filename = cfg["STATIC_ROOT"] + "html/components/permissions_denied.html";
      is_static = true;
    } else if (path == "/scripts/all_users.js") {
      filename = cfg["STATIC_ROOT"] + "html/scripts/all_users.js";
      is_static = true;
    } else if (path == "/scripts/delete.js") {
      filename = cfg["STATIC_ROOT"] + "html/scripts/delete.js";
      is_static = true;
    } else if (path == "/js/fits/utils.js") {
      filename = cfg["STATIC_ROOT"] + "html/js/fits/utils.js";
      is_static = true;
    } else if (path == "/js/fits/async.js") {
      filename = cfg["STATIC_ROOT"] + "html/js/fits/async.js";
      is_static = true;
    } else if (path == "/js/fits/bson.js") {
      filename = cfg["STATIC_ROOT"] + "html/js/fits/bson.js";
      is_static = true;
    } else if (path == "/js/fits/list.js") {
      filename = cfg["STATIC_ROOT"] + "html/js/fits/list.js";
      is_static = true;
    } else if (path == "/js/fits/colormap.js") {
      filename = cfg["STATIC_ROOT"] + "html/js/fits/colormap.js";
      is_static = true;
    } else if (path == "/js/fits/fits.js") {
      filename = cfg["STATIC_ROOT"] + "html/js/fits/fits.js";
      is_static = true;
    } else if (path == "/js/fits/js9.js") {
      filename = cfg["STATIC_ROOT"] + "html/js/fits/js9.js";
      is_static = true;
    } else if (path == "/js/fits/d3.v3.min.js") {
      filename = cfg["STATIC_ROOT"] + "html/js/fits/d3.v3.min.js";
      is_static = true;
    } else if (path == "/components/error.html") {
      filename = cfg["STATIC_ROOT"] + "html/components/error.html";
      is_static = true;
    }

    if (is_static) {
      std::cout << "CHECK STATIC" << '\n';
      fileContent = readFile(filename);
      response_body << fileContent.c_str();
    }

    if (!params.empty() && path == cfg["REGISTER_PATH"]) {
        std::cout << params["token"] << std::endl;
        std::string q = ("SELECT * FROM users WHERE session_token = '" + params["token"] + "'");
        SQL = q.c_str();

        std::cout << "SQL: " << SQL << std::endl;

        if (sqlite3_open(cfg["DB"].c_str(), &db))
        fprintf(stderr, "Error of open/create DB: %s\n", sqlite3_errmsg(db));

        Records recs = select_stmt(SQL);
        Record admin = recs[0];
        std::string status = admin[3];

        std::cout << "Status: " << status << std::endl;

        if (recs.size() != 0) {
          if (check_session(admin, cfg["TOKEN_LIFETIME"], err_db, cfg["DB"])) {
            if (status == "0") {

              std::string query = ("SELECT * FROM users WHERE login = '" + params["login"] + "';").data();
              SQL = query.c_str();


              Records records = select_stmt(SQL);
              if (records.size() == 0)
              {

                std::string query = ("INSERT INTO users (login, password) VALUES ('" + params["login"] + "', '" + sha512(params["password"]) + "');").data();
                SQL = query.c_str();
                if (sqlite3_open(cfg["DB"].c_str(), &db))
                fprintf(stderr, "Error of open/create DB: %s\n", sqlite3_errmsg(db));
                else if (sqlite3_exec(db, SQL, 0, 0, &err_db))
                {
                  fprintf(stderr, "SQL error: %sn", err_db);
                  sqlite3_free(err_db);
                }
                response["status"] = "OK";
                response["code"] = 200;
                response["message"] = "User created";
                response_body << response;
            } else {
              nlohmann::json response;
              response["status"] = "ERROR";
              response["code"] = 500;
              response["error"] = "Permissions denied!";
              response_body << response;
            }
          } else {
            nlohmann::json response;
            response["status"] = "ERROR";
            response["code"] = 500;
            response["error"] = "Session is end!";
            response_body << response;
          }

          }
          else
          {
            nlohmann::json response;
            response["status"] = "ERROR";
            response["code"] = 500;
            response["error"] = "Session is end!";
            response_body << response;
          }

          sqlite3_close(db);
        }
        else {
          nlohmann::json response;
          response["status"] = "ERROR";
          response["code"] = 500;
          response["error"] = "Session is end!";
          response_body << response;
        }

    } else if (!params.empty() && path == cfg["LOGIN_PATH"]) {
        const char* data = "Callback function called";
        std::string query = ("SELECT login, password, status, session_token FROM users WHERE login = '" + params["login"] + "' AND password = '" + sha512(params["password"]) + "';").data();
        SQL = query.c_str();
        if (sqlite3_open(cfg["DB"].c_str(), &db))
            fprintf(stderr, "Open/create DB error: %s\n", sqlite3_errmsg(db));
        Records records = select_stmt(SQL);

        if (records.size() >= 1)
        {
            Record record = records[0];
            std::string token = get_token();

            const auto p1 = std::chrono::system_clock::now();
            int token_time = std::chrono::duration_cast<std::chrono::seconds>(p1.time_since_epoch()).count();

            std::string query = ("UPDATE users SET session_token = '" + token + "', session_time = '" + std::to_string(token_time) + "' WHERE login = '" + params["login"] + "';").data();
            SQL = query.c_str();

            if (sqlite3_exec(db, SQL, 0, 0, &err_db))
            {
                fprintf(stderr, "SQL error: %sn", err_db);
                sqlite3_free(err_db);
            }

            nlohmann::json user;

            user["login"] = record[0];
            user["status"] = record[2];
            user["token"] = token;

            response["status"] = "OK";
            response["code"] = 200;
            response["data"] = user;

            response_body << response;
        }
        else
        {
            nlohmann::json response;

            response["status"] = "ERROR";
            response["code"] = 500;
            response["error"] = "Incorrected password or login!";

            response_body << response;
        }
        sqlite3_close(db);
    } else if (!params.empty() && path == cfg["LOGOUT_PATH"]) {
        std::string query = ("SELECT login, status, session_time FROM users WHERE session_token = '" + params["token"] + "';").data();
        SQL = query.c_str();
        if (sqlite3_open(cfg["DB"].c_str(), &db))
            fprintf(stderr, "Open/create DB error: %s\n", sqlite3_errmsg(db));
        Records records = select_stmt(SQL);
        sqlite3_close(db);
        if (records.size() > 0)
        {
            Record record = records[0];
            std::time_t t = std::time(nullptr);
            const auto p1 = std::chrono::system_clock::now();
            int now = std::chrono::duration_cast<std::chrono::seconds>(p1.time_since_epoch()).count();

            std::string query = ("UPDATE users SET session_token = '0', session_time = '0' WHERE session_token = '" + params["token"] + "';").data();
            SQL = query.c_str();
            if (sqlite3_open(cfg["DB"].c_str(), &db))
                fprintf(stderr, "Open/create DB error: %s\n", sqlite3_errmsg(db));

            if (sqlite3_exec(db, SQL, 0, 0, &err_db))
            {
                fprintf(stderr, "SQL error: %sn", err_db);
                sqlite3_free(err_db);
            }

            sqlite3_close(db);

            response["status"] = "OK";
            response["code"] = 200;
            response["message"] = "Logout Success!";

            response_body << response;

        }
        else
        {
            response["status"] = "ERROR";
            response["code"] = 500;
            response["error"] = "Not Auth!";

            response_body << response;
        }
    } else if (!params.empty() && path == cfg["GET_USER_PATH"]) {
        std::string query = ("SELECT * FROM users WHERE session_token = '" + params["token"] + "';").data();
        SQL = query.c_str();
        if (sqlite3_open(cfg["DB"].c_str(), &db))
            fprintf(stderr, "Open/create DB error: %s\n", sqlite3_errmsg(db));
        // execute SQL
        Records records = select_stmt(SQL);
        sqlite3_close(db);
        if (records.size() > 0)
        {
            Record record = records[0];
            if (!check_session(record, cfg["TOKEN_LIFETIME"], err_db, cfg["DB"])) {

                std::cout << "Check" << std::endl;
                response["status"] = "ERROR";
                response["code"] = 501;
                response["error"] = "Session is end!";

                response_body << response;
            }
            else
            {
                nlohmann::json user;

                user["login"] = record[1];
                user["status"] = record[3];

                response["status"] = "OK";
                response["code"] = 200;
                response["data"] = user;

                response_body << response;
            }

        }
        else
        {

            response["status"] = "ERROR";
            response["code"] = 500;
            response["error"] = "Not Auth!";

            response_body << response;
        }
    } else if (!params.empty() && path == cfg["GET_USERS_PATH"]) {
        std::string query = ("SELECT * FROM users WHERE session_token = '" + params["token"] + "';").data();
        SQL = query.c_str();
        if (sqlite3_open(cfg["DB"].c_str(), &db))
            fprintf(stderr, "Open/create DB error: %s\n", sqlite3_errmsg(db));
        Records records = select_stmt(SQL);
        sqlite3_close(db);
        if (records.size() > 0)
        {
            Record record = records[0];
            if (!check_session(record, cfg["TOKEN_LIFETIME"], err_db, cfg["DB"])) {

                response["status"] = "ERROR";
                response["code"] = 501;
                response["error"] = "Session is end!";

                response_body << response;
            }
            else
            {
                if (std::stoi(record[3]) == 0)
                {
                    query = "SELECT * FROM users";
                    SQL = query.c_str();
                    if (sqlite3_open(cfg["DB"].c_str(), &db))
                        fprintf(stderr, "Open/create DB error: %s\n", sqlite3_errmsg(db));
                    records = select_stmt(SQL);
                    sqlite3_close(db);

                    std::vector<nlohmann::json> users;

                    response["status"] = "OK";
                    response["code"] = 200;

                    for (int i = 0; i < records.size(); i++)
                    {
                        nlohmann::json user;

                        user["id"] = records[i][0];
                        user["login"] = records[i][1];
                        user["status"] = records[i][3];
                        user["token"] = records[i][4];
                        user["time"] = records[i][5];

                        users.push_back(user);
                    }

                    response["data"] = users;
                    response_body << response;
                }
                else
                {

                    response["status"] = "ERROR";
                    response["code"] = 502;
                    response["error"] = "Permissions denied!";

                    response_body << response;
                }
            }

        }
      }   else if (!params.empty() && path == cfg["SET_USER_STATUS_PATH"]) {
            std::string query = ("SELECT * FROM users WHERE session_token = '" + params["token"] + "';").data();
            SQL = query.c_str();
            if (sqlite3_open(cfg["DB"].c_str(), &db))
                fprintf(stderr, "Open/create DB error: %s\n", sqlite3_errmsg(db));
            Records records = select_stmt(SQL);
            sqlite3_close(db);
            if (records.size() > 0)
            {
                Record record = records[0];
                if (!check_session(record, cfg["TOKEN_LIFETIME"], err_db, cfg["DB"])) {

                    response["status"] = "ERROR";
                    response["code"] = 501;
                    response["error"] = "Session is end!";

                    response_body << response;
                }
                else
                {
                    if (std::stoi(record[3]) < 3)
                    {
                        query = "UPDATE users SET status = " + params["status"] + " WHERE id = " + params["id"];
                        std::cout << query << '\n';
                        SQL = query.c_str();
                        if (sqlite3_open(cfg["DB"].c_str(), &db))
                            fprintf(stderr, "Open/create DB error: %s\n", sqlite3_errmsg(db));
                        records = select_stmt(SQL);
                        sqlite3_close(db);

                        response["status"] = "OK";
                        response["code"] = 200;

                        response["message"] = "User updated successfully";
                        response_body << response;
                    }
                    else
                    {

                        response["status"] = "ERROR";
                        response["code"] = 502;
                        response["error"] = "Acces denied!";

                        response_body << response;
                    }
                }

            }
            else
            {
                response["status"] = "ERROR";
                response["code"] = 500;
                response["error"] = "Not Auth!";

                response_body << response;
            }
          } else if (!params.empty() && path == cfg["DELETE_USER_PATH"]) {
              std::string query = ("SELECT * FROM users WHERE session_token = '" + params["token"] + "';").data();
              SQL = query.c_str();
              if (sqlite3_open(cfg["DB"].c_str(), &db))
                  fprintf(stderr, "Open/create DB error: %s\n", sqlite3_errmsg(db));
              Records records = select_stmt(SQL);
              sqlite3_close(db);
              if (records.size() > 0)
              {
                  Record record = records[0];
                  if (!check_session(record, cfg["TOKEN_LIFETIME"], err_db, cfg["DB"])) {

                      response["status"] = "ERROR";
                      response["code"] = 501;
                      response["error"] = "Session is end!";

                      response_body << response;
                  }
                  else
                  {
                      if (std::stoi(record[3]) == 0)
                      {
                          query = "DELETE FROM users WHERE id = '" + params["id"] + "'";
                          SQL = query.c_str();
                          if (sqlite3_open(cfg["DB"].c_str(), &db))
                              fprintf(stderr, "Open/create DB error: %s\n", sqlite3_errmsg(db));
                          records = select_stmt(SQL);
                          sqlite3_close(db);

                          response["status"] = "OK";
                          response["code"] = 200;

                          response["message"] = "User deleted successfully";
                          response_body << response;
                      }
                      else
                      {

                          response["status"] = "ERROR";
                          response["code"] = 502;
                          response["error"] = "Acces denied!";

                          response_body << response;
                      }
                  }

              }
              else
              {
                  response["status"] = "ERROR";
                  response["code"] = 500;
                  response["error"] = "Not Auth!";

                  response_body << response;
              }
          }

    /* Запись ответа */
    resp = "HTTP/1.0 200 OK\nServer: EKRServer\nAccess-Control-Allow-Origin: *\nAccess-Control-Request-Method: GET\n\n" + response_body.str();
    printf("%s\n", response_body.str().c_str());
    r = SSL_write(ssl, resp.c_str(), resp.length());
    if(r<=0)  // if r < 0 then raise error
    {
        printf("Write error %d\n",r);
    }
    else
    {
        printf("Write ok %d\n",r);
     }

    /* Close connection */
    shutdown(s,1);
    SSL_shutdown(ssl);

    SSL_free(ssl);
    close(s);

    return(0);
}

int main(int argc, char *argv[])
{
  // Проверяем, запущен ли уже демон
    int pid_file = open("/var/run/my_server.pid", O_CREAT | O_RDWR, 0666);
    int rc = fcntl(pid_file, LOCK_EX | LOCK_NB);
    if (rc) {
      if (EWOULDBLOCK == errno) {
          std::cerr << "The server is already running." << std::endl;
          return EXIT_SUCCESS;
      }
    }

    // Создаем дочерний процесс и завершаем родительский процесс
    pid_t pid = fork();
    if (pid < 0) {
      std::cerr << "Failed to fork the process." << std::endl;
      return EXIT_FAILURE;
    }
    if (pid > 0) {
      // Родительский процесс завершается
      return EXIT_SUCCESS;
    }

    // Дочерний процесс становится лидером сессии и создает новый SID
    pid_t sid = setsid();
    if (sid < 0) {
      std::cerr << "Failed to create a new session." << std::endl;
      return EXIT_FAILURE;
    }

    // Закрываем стандартные дескрипторы ввода, вывода и ошибок
    close(STDIN_FILENO);
    close(STDOUT_FILENO);
    close(STDERR_FILENO);

    // Открываем файл для записи PID демона
    pid_file = open("/var/run/my_server.pid", O_RDWR);
    if (pid_file < 0) {
      std::cerr << "Failed to open PID file." << std::endl;
      return EXIT_FAILURE;
    }

    // Блокируем файл PID
    rc = fcntl(pid_file, LOCK_EX);
    if (rc) {
      std::cerr << "Failed to lock PID file." << std::endl;
      return EXIT_FAILURE;
    }

    // Записываем PID демона в файл
    char pid_str[16];
    snprintf(pid_str, sizeof(pid_str), "%d\n", getpid());
    write(pid_file, pid_str, strlen(pid_str));

    int sock,s;
    SSL_CTX *ctx;
    SSL *ssl;
    int r;

    sqlite3_stmt* stmt;
    char* err_db = 0;

    signal(SIGHUP, handleSIGHUP);

    std::cout << "ARGUMENTS:" << '\n';

    for (int i = 0; i < argc; i++) {
      std::cout << argv[i] << '\n';
    }

    std::string cfg_path = GetParameterValue("-DCONFIG_FILE_PATH", argc, argv);

    std::map<std::string, std::string> cfg = open_ini_file(cfg_path);

    const int PORT = std::atoi(cfg["PORT"].c_str());

    // Open connection
    if (sqlite3_open(cfg["DB"].c_str(), &db))
        fprintf(stderr, "Open/create DB error: %s\n", sqlite3_errmsg(db));
    // execute SQL
    else if (sqlite3_exec(db, SQL, 0, 0, &err_db))
    {
        fprintf(stderr, "SQL error: %sn", err_db);
        sqlite3_free(err_db);
    }
    // close connection
    sqlite3_close(db);

    // Build our SSL context
    ctx=initialize_ctx(KEY_FILE,PEM_FILE);

    sock=tcp_listen(PORT);
    printf("\n");

    std::string query = ("SELECT * FROM users WHERE login = 'admin';");
    SQL = query.c_str();

    if (sqlite3_open(cfg["DB"].c_str(), &db))
        fprintf(stderr, "Error of open/create DB: %s\n", sqlite3_errmsg(db));

    Records records = select_stmt(SQL);
    if (records.size() == 0)
    {

        std::string query = ("INSERT INTO users (login, password, status) VALUES ('"+ cfg["ADMIN_NAME"] + "', '" + sha512(cfg["ADMIN_PASSWORD"]) + "', 0);").data();
        SQL = query.c_str();
        if (sqlite3_open(cfg["DB"].c_str(), &db))
            fprintf(stderr, "Error of open/create DB: %s\n", sqlite3_errmsg(db));
        else if (sqlite3_exec(db, SQL, 0, 0, &err_db))
        {
            fprintf(stderr, "SQL error: %sn", err_db);
            sqlite3_free(err_db);
        }
    }

    sqlite3_close(db);

    while(1)
    {
        if((s=accept(sock,0,0))<0)
        {
            printf("Problem accepting\n");
        }
        else
        {
            printf("Accepting %d\n",s);
        }

        ssl=SSL_new(ctx);
        SSL_set_fd(ssl, s);
        r=SSL_accept(ssl);
        if( r < 0 )
        {
            printf("SSL accept error %d\n",r);
            printf("SSL accept error code %d\n",SSL_get_error(ssl,r) );
            continue;
        }
        else
        {
            printf("SSL accept %d\n",r);
        }

        http_serve(ssl,s,err_db,cfg);
        printf("\n");
    }

    SSL_CTX_free(ctx);

    // Освобождаем файл PID и удаляем его
    fcntl(pid_file, LOCK_UN);
    close(pid_file);
    unlink("/var/run/my_server.pid");

    return EXIT_SUCCESS;
}
