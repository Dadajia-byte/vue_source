#!/bin/bash

# 输出文件名
output_file="vue源码history.md"

# 初始化输出文件
echo "## VueSource History" > $output_file
echo "" >> $output_file

# 获取提交记录，过滤掉合并操作，并格式化输出
git log --no-merges --pretty=format:"%ad %s" --date=short | while read -r line; do
  # 提取提交日期和提交信息
  commit_date=$(echo "$line" | awk '{print $1}')
  commit_message=$(echo "$line" | cut -d' ' -f2-)

  # 去除 feat: / fix: / docs: 等前缀
  commit_message=$(echo "$commit_message" | sed -E 's/^(feat: |fix: |docs: )//')

  # 输出到 Markdown 文件
  echo "#### $commit_date" >> $output_file
  echo "$commit_message" >> $output_file
  echo "" >> $output_file
done

echo "提交记录已输出到 $output_file"