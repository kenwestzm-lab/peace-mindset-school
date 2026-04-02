video: {
  type: String,
  default: null,
},
deletedBy: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
}],
