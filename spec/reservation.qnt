module reservation {
  // ---------- 型 ----------
  // テストが API に送るリクエストを、仕様の中で値として表す
  type Request =
    | Start                // 初期状態（リクエストなし）
    | Reserve(str)         // POST /reservations   { user }
    | Cancel(int)          // DELETE /reservations/:id

  // ---------- 定数 ----------
  pure val INITIAL_STOCK = 3
  pure val USERS = Set("alice", "bob")
  pure val IDS = 1.to(5)

  // ---------- 状態 ----------
  var stock: int                  // 残り在庫数
  var reservations: int -> str    // 予約ID -> ユーザー
  var nextId: int                 // 次に払い出す予約ID
  var lastRequest: Request        // 直前に受けたリクエスト
  var lastStatus: int             // そのリクエストに返すべき HTTP ステータス

  // ---------- 初期状態 ----------
  action init = all {
    stock' = INITIAL_STOCK,
    reservations' = Map(),
    nextId' = 1,
    lastRequest' = Start,
    lastStatus' = 0,
  }

  // ---------- 操作 ----------
  // POST /reservations
  action reserve(user: str): bool = all {
    lastRequest' = Reserve(user),
    if (stock > 0) all {
      stock' = stock - 1,
      reservations' = reservations.put(nextId, user),
      nextId' = nextId + 1,
      lastStatus' = 201,
    } else all {
      stock' = stock,
      reservations' = reservations,
      nextId' = nextId,
      lastStatus' = 409,
    },
  }

  // DELETE /reservations/:id
  action cancel(id: int): bool = all {
    lastRequest' = Cancel(id),
    if (reservations.keys().contains(id)) all {
      stock' = stock + 1,
      reservations' = reservations.keys().exclude(Set(id)).mapBy(k => reservations.get(k)),
      nextId' = nextId,
      lastStatus' = 204,
    } else all {
      stock' = stock,
      reservations' = reservations,
      nextId' = nextId,
      lastStatus' = 404,
    },
  }

  // ---------- 環境（どのリクエストがいつ来るか） ----------
  action step = {
    nondet user = USERS.oneOf()
    nondet id = IDS.oneOf()
    any {
      reserve(user),
      cancel(id),
    }
  }

  // ---------- 不変条件 ----------
  val stockNeverNegative = stock >= 0
  val stockIsConserved = stock + reservations.keys().size() == INITIAL_STOCK

  // ---------- 仕様そのもののテスト（quint test で実行） ----------
  run soldOutTest =
    init
      .then(reserve("alice"))
      .then(reserve("bob"))
      .then(reserve("alice"))
      .then(reserve("bob"))
      .expect(lastStatus == 409 and stock == 0)

  run cancelRestoresStockTest =
    init
      .then(reserve("alice"))
      .then(cancel(1))
      .expect(lastStatus == 204 and stock == INITIAL_STOCK)

  run cancelUnknownIdTest =
    init
      .then(cancel(1))
      .expect(lastStatus == 404 and stock == INITIAL_STOCK)
}